// ImmersiveExecutionSpace.swift
// COMET visionOS — Full Spatial Awareness Mode
// Activates when user enters the immersive space
//
// Architecture:
//   - Renders SMG states as floating 3D nodes in the user's physical space
//   - Active execution node pulses with Copper glow
//   - World-anchored — nodes persist relative to real-world space
//   - Lynch classification determines node shape + color

import SwiftUI
import RealityKit
import ARKit

/// 3D position for a spatial SMG node
struct SpatialNode: Identifiable {
    let id: String
    let label: String
    let lynchType: String
    var position: SIMD3<Float>
    var isActive: Bool
    var status: String  // idle, executing, complete, failed, repaired
}

// Lynch color mapping for spatial nodes
private func lynchColor(for type: String) -> SimpleMaterial.Color {
    switch type {
    case "landmark": return .init(red: 0.91, green: 0.38, blue: 0.10, alpha: 0.9)
    case "node":     return .init(red: 0.72, green: 0.23, blue: 0.16, alpha: 0.9)
    case "district": return .init(red: 0.69, green: 0.43, blue: 0.20, alpha: 0.8)
    case "path":     return .init(red: 0.35, green: 0.29, blue: 0.23, alpha: 0.7)
    default:         return .init(red: 0.20, green: 0.18, blue: 0.15, alpha: 0.6)
    }
}

// Lynch shape mapping — landmark is sphere, node is icosahedron, etc.
private func lynchMesh(for type: String) -> MeshResource {
    switch type {
    case "landmark": return .generateSphere(radius: 0.04)
    case "node":     return .generateSphere(radius: 0.03)
    case "district": return .generateBox(size: [0.05, 0.03, 0.05])
    case "path":     return .generateBox(size: [0.09, 0.01, 0.02])
    default:         return .generateBox(size: [0.04, 0.04, 0.01])
    }
}

// ── Spatial SMG Node Entity ───────────────────────────────────────────────────
class SMGNodeEntity: Entity, HasModel, HasCollision {
    var nodeData: SpatialNode

    required init() {
        nodeData = SpatialNode(id: "", label: "", lynchType: "node",
                                position: .zero, isActive: false, status: "idle")
        super.init()
    }

    init(node: SpatialNode) {
        nodeData = node
        super.init()

        var mat = SimpleMaterial()
        mat.color = .init(tint: lynchColor(for: node.lynchType))
        mat.roughness = 0.4
        mat.metallic = 0.6

        components.set(ModelComponent(
            mesh: lynchMesh(for: node.lynchType),
            materials: [mat]
        ))

        position = node.position
        generateCollisionShapes(recursive: false)
    }

    func setActive(_ active: Bool) {
        guard var model = components[ModelComponent.self] else { return }
        var mat = SimpleMaterial()
        if active {
            // Copper glow for active node
            mat.color = .init(tint: .init(red: 0.91, green: 0.38, blue: 0.10, alpha: 1.0))
            mat.roughness = 0.1
            mat.metallic = 0.9
        } else {
            mat.color = .init(tint: lynchColor(for: nodeData.lynchType))
            mat.roughness = 0.4
            mat.metallic = 0.6
        }
        model.materials = [mat]
        components.set(model)
    }
}

// ── RealityKit Spatial Scene ──────────────────────────────────────────────────
struct ImmersiveExecutionSpace: View {
    @EnvironmentObject var appState: CometAppState
    @State private var spatialNodes: [SpatialNode] = []

    var body: some View {
        RealityView { content in
            // Floor anchor — place SMG nodes in a semicircle ahead of user
            let anchor = AnchorEntity(world: [0, 1.5, -1.5])
            content.add(anchor)

            // Generate initial demo spatial layout
            let demoNodes = makeDemoNodes()
            for node in demoNodes {
                let entity = SMGNodeEntity(node: node)
                anchor.addChild(entity)
            }

        } update: { content in
            // Pulse the active node
            content.entities.forEach { entity in
                if let smgEntity = entity as? SMGNodeEntity {
                    let isActive = smgEntity.nodeData.id == appState.activeNodeID
                    smgEntity.setActive(isActive)
                }
            }
        }
        .gesture(TapGesture().targetedToAnyEntity().onEnded { value in
            // Tapping a spatial node selects its instruction
            if let smgEntity = value.entity as? SMGNodeEntity {
                appState.targetURL = "https://\(smgEntity.nodeData.label)"
            }
        })
    }

    /// Helper: arrange nodes in a semicircle
    private func makeDemoNodes() -> [SpatialNode] {
        let types = ["landmark", "node", "district", "path", "edge",
                     "node", "landmark", "path", "district", "node"]
        let labels = ["home", "search", "profile", "feed", "settings",
                      "checkout", "dashboard", "nav", "explore", "notifications"]
        return zip(types, labels).enumerated().map { i, pair in
            let angle = Float(i) * (Float.pi / 5.0) - Float.pi / 2
            let radius: Float = 0.6
            return SpatialNode(
                id: "demo_\(i)",
                label: pair.1,
                lynchType: pair.0,
                position: [cos(angle) * radius, Float(i % 3) * 0.15 - 0.15, sin(angle) * radius * 0.5],
                isActive: false,
                status: "idle"
            )
        }
    }
}

// ── Execution Monitor View ────────────────────────────────────────────────────
// Secondary window — pure execution log + plan node list
struct ExecutionMonitorView: View {
    @EnvironmentObject var state: CometAppState

    private let typeColors: [String: Color] = [
        "node_start":    Color(red: 0.69, green: 0.43, blue: 0.20),
        "node_complete": .green,
        "node_failed":   Color(red: 0.72, green: 0.23, blue: 0.16),
        "node_repaired": Color(red: 0.55, green: 0.76, blue: 0.29),
        "plan_complete": Color(red: 0.91, green: 0.38, blue: 0.10),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("◉ EXECUTION MONITOR")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(red: 0.91, green: 0.38, blue: 0.10))
                Spacer()
                PhaseIndicator(phase: state.phase)
            }
            .padding(16)
            .background(Color.black.opacity(0.7))

            Divider().background(Color(white: 0.15))

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(state.events) { evt in
                            HStack(alignment: .top, spacing: 10) {
                                Text(String(evt.timestamp.dropFirst(11).prefix(8)))
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(Color(white: 0.35))
                                    .frame(width: 65, alignment: .leading)
                                Text(evt.type.uppercased())
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(typeColors[evt.type] ?? Color(white: 0.6))
                                    .frame(width: 120, alignment: .leading)
                                VStack(alignment: .leading, spacing: 2) {
                                    if let desc = evt.description {
                                        Text(desc).font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(Color(white: 0.75)).lineLimit(2)
                                    }
                                    if let err = evt.error {
                                        Text("✕ \(err)").font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(Color(red: 0.72, green: 0.23, blue: 0.16))
                                    }
                                }
                            }
                            .padding(.horizontal, 16).padding(.vertical, 2)
                            .background(state.activeNodeID == evt.node_id
                                ? Color(white: 0.1) : Color.clear)
                            .id(evt.id)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .onChange(of: state.events.count) { _ in
                    if let last = state.events.last { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
        .background(Color(red: 0.06, green: 0.05, blue: 0.04))
        .glassBackgroundEffect()
    }
}

// ── Phase Indicator ───────────────────────────────────────────────────────────
private struct PhaseIndicator: View {
    let phase: ExecutionPhase

    var color: Color {
        switch phase {
        case .idle:       return Color(white: 0.3)
        case .sketching:  return Color(red: 0.69, green: 0.43, blue: 0.20)
        case .linking:    return Color.yellow.opacity(0.8)
        case .compiling:  return Color.orange.opacity(0.8)
        case .executing:  return Color(red: 0.91, green: 0.38, blue: 0.10)
        case .validating: return Color.yellow
        case .complete:   return Color.green
        case .blocked:    return Color(red: 0.72, green: 0.23, blue: 0.16)
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(phase.rawValue.uppercased())
                .font(.system(size: 9, design: .monospaced))
                .foregroundColor(color).tracking(1.5)
        }
    }
}
