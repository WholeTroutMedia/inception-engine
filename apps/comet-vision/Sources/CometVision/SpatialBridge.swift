// SpatialBridge.swift
// Bridges CometVision (visionOS/iOS) to the Spatial Intelligence gRPC service.
//
// Captures ARKit LiDAR point clouds and camera frames, sends them to the
// NAS-hosted spatial-intelligence server, and receives scene graphs +
// spatial query responses for real-time spatial awareness.
//
// Ref: Issue #35 (Phase 3), Issue #20 (Spatial Intelligence Pipeline)

import Foundation
import Combine
import ARKit

// MARK: - Configuration

private let SPATIAL_HOST = ProcessInfo.processInfo.environment["SPATIAL_HOST"]
    ?? "192.168.2.15"
private let SPATIAL_PORT = Int(ProcessInfo.processInfo.environment["SPATIAL_PORT"] ?? "50051") ?? 50051
private let SPATIAL_REST_PORT = Int(ProcessInfo.processInfo.environment["SPATIAL_REST_PORT"] ?? "7860") ?? 7860

// MARK: - Data Models

struct SpatialPoint: Codable {
    let x: Float
    let y: Float
    let z: Float
    let r: Float?
    let g: Float?
    let b: Float?
}

struct SceneNode: Codable, Identifiable {
    let id: String
    let label: String
    let centroid: [Float]
    let bbox_min: [Float]
    let bbox_max: [Float]
    let confidence: Float
}

struct SceneEdge: Codable {
    let source: String
    let target: String
    let relation: String
}

struct SceneGraphResponse: Codable {
    let nodes: [SceneNode]
    let edges: [SceneEdge]
    let latency_ms: Float
}

struct SpatialQueryResponse: Codable {
    let answer: String
    let grounded_nodes: [String]
    let confidence: Float
}

enum SpatialBridgeError: Error {
    case connectionFailed(String)
    case encodingFailed
    case serverError(String)
    case arkitUnavailable
    case timeout
}

// MARK: - SpatialBridge

@MainActor
final class SpatialBridge: ObservableObject {
    
    // Published state
    @Published var isConnected = false
    @Published var lastSceneGraph: SceneGraphResponse?
    @Published var lastQueryAnswer: SpatialQueryResponse?
    @Published var isCapturing = false
    @Published var pointCloudCount = 0
    @Published var latencyMs: Float = 0
    
    private let session = URLSession.shared
    private var streamTask: Task<Void, Never>?
    private var captureTimer: Timer?
    
    // ARKit session for LiDAR capture
    private var arSession: ARSession?
    
    private var baseURL: String {
        "http://\(SPATIAL_HOST):\(SPATIAL_REST_PORT)"
    }
    
    // MARK: - Connection
    
    func connect() async {
        do {
            let url = URL(string: "\(baseURL)/health")!
            let (_, response) = try await session.data(from: url)
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                isConnected = true
                print("[SpatialBridge] Connected to \(SPATIAL_HOST):\(SPATIAL_REST_PORT)")
            }
        } catch {
            isConnected = false
            print("[SpatialBridge] Connection failed: \(error)")
        }
    }
    
    func disconnect() {
        stopCapture()
        streamTask?.cancel()
        streamTask = nil
        arSession?.pause()
        isConnected = false
    }
    
    // MARK: - ARKit Point Cloud Capture
    
    func startCapture(fps: Double = 5.0) {
        guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
            print("[SpatialBridge] LiDAR not available on this device")
            return
        }
        
        let config = ARWorldTrackingConfiguration()
        config.sceneReconstruction = .mesh
        config.frameSemantics = [.sceneDepth, .smoothedSceneDepth]
        
        arSession = ARSession()
        arSession?.run(config)
        isCapturing = true
        
        // Periodic capture at specified FPS
        let interval = 1.0 / fps
        captureTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                await self.captureAndSend()
            }
        }
        
        print("[SpatialBridge] Started ARKit capture at \(fps) FPS")
    }
    
    func stopCapture() {
        captureTimer?.invalidate()
        captureTimer = nil
        arSession?.pause()
        isCapturing = false
    }
    
    private func captureAndSend() async {
        guard let frame = arSession?.currentFrame else { return }
        
        // Extract point cloud from ARKit frame
        if let points = extractPointCloud(from: frame) {
            pointCloudCount = points.count
            await sendPointCloud(points)
        }
    }
    
    private func extractPointCloud(from frame: ARFrame) -> [SpatialPoint]? {
        guard let depthMap = frame.smoothedSceneDepth?.depthMap ?? frame.sceneDepth?.depthMap else {
            return nil
        }
        
        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)
        
        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
        
        guard let baseAddress = CVPixelBufferGetBaseAddress(depthMap) else { return nil }
        let depthData = baseAddress.assumingMemoryBound(to: Float32.self)
        
        // Camera intrinsics
        let intrinsics = frame.camera.intrinsics
        let fx = intrinsics[0][0]
        let fy = intrinsics[1][1]
        let cx = intrinsics[2][0]
        let cy = intrinsics[2][1]
        
        // Get camera image for RGB
        let capturedImage = frame.capturedImage
        
        var points: [SpatialPoint] = []
        let stride = 4 // Subsample for performance
        
        for y in Swift.stride(from: 0, to: height, by: stride) {
            for x in Swift.stride(from: 0, to: width, by: stride) {
                let depth = depthData[y * width + x]
                guard depth > 0.1 && depth < 5.0 else { continue }
                
                // Deproject to 3D
                let px = (Float(x) - cx) * depth / fx
                let py = (Float(y) - cy) * depth / fy
                let pz = depth
                
                // Transform to world space
                let cam = frame.camera.transform
                let worldX = cam[0][0] * px + cam[1][0] * py + cam[2][0] * pz + cam[3][0]
                let worldY = cam[0][1] * px + cam[1][1] * py + cam[2][1] * pz + cam[3][1]
                let worldZ = cam[0][2] * px + cam[1][2] * py + cam[2][2] * pz + cam[3][2]
                
                points.append(SpatialPoint(
                    x: worldX, y: worldY, z: worldZ,
                    r: nil, g: nil, b: nil
                ))
            }
        }
        
        return points
    }
    
    // MARK: - Server Communication
    
    private func sendPointCloud(_ points: [SpatialPoint]) async {
        guard isConnected else { return }
        
        do {
            let url = URL(string: "\(baseURL)/api/encode")!
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 10
            
            let payload: [String: Any] = [
                "points": points.map { ["x": $0.x, "y": $0.y, "z": $0.z] },
                "return_scene_graph": true
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            
            let (data, _) = try await session.data(for: request)
            let graph = try JSONDecoder().decode(SceneGraphResponse.self, from: data)
            
            lastSceneGraph = graph
            latencyMs = graph.latency_ms
        } catch {
            print("[SpatialBridge] Send failed: \(error)")
        }
    }
    
    func querySpatial(_ question: String) async throws -> SpatialQueryResponse {
        guard isConnected else {
            throw SpatialBridgeError.connectionFailed("Not connected")
        }
        
        let url = URL(string: "\(baseURL)/api/query")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload = ["question": question]
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode(SpatialQueryResponse.self, from: data)
        
        lastQueryAnswer = response
        return response
    }
    
    // MARK: - Single Frame Capture
    
    func captureFrame() async -> SceneGraphResponse? {
        guard let frame = arSession?.currentFrame,
              let points = extractPointCloud(from: frame) else {
            return nil
        }
        
        await sendPointCloud(points)
        return lastSceneGraph
    }
    
    // MARK: - RGB Frame Depth Estimation
    
    func estimateDepth(from image: CGImage) async throws -> [[Float]] {
        guard isConnected else {
            throw SpatialBridgeError.connectionFailed("Not connected")
        }
        
        let url = URL(string: "\(baseURL)/api/depth")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        
        // Encode CGImage as JPEG
        let bitmapRep = NSBitmapImageRep(cgImage: image)
        guard let jpegData = bitmapRep.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) else {
            throw SpatialBridgeError.encodingFailed
        }
        request.httpBody = jpegData
        
        let (data, _) = try await session.data(for: request)
        let depthMap = try JSONDecoder().decode([[Float]].self, from: data)
        return depthMap
    }
}