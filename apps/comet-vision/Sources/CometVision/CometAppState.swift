// CometAppState.swift
// Global app state for the COMET visionOS browser
// Manages execution state, SMG coverage, and immersive mode transitions

import Foundation
import Combine

/// Execution phase — mirrors COMET server MixedActionPlan node types
enum ExecutionPhase: String, Equatable {
    case idle, sketching, linking, compiling, executing, validating, complete, blocked
}

/// A single execution event streamed from COMET WebSocket
struct ExecutionEvent: Identifiable, Codable {
    let id: UUID
    let type: String
    let node_id: String?
    let description: String?
    let status: String?
    let error: String?
    let timestamp: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = UUID()
        type = try c.decode(String.self, forKey: .type)
        node_id = try? c.decode(String.self, forKey: .node_id)
        description = try? c.decode(String.self, forKey: .description)
        status = try? c.decode(String.self, forKey: .status)
        error = try? c.decode(String.self, forKey: .error)
        timestamp = (try? c.decode(String.self, forKey: .timestamp)) ?? ISO8601DateFormatter().string(from: Date())
    }

    enum CodingKeys: String, CodingKey {
        case type, node_id, description, status, error, timestamp
    }
}

/// SMG coverage report from GHOST
struct SMGCoverage: Codable {
    let domain: String
    let exists: Bool
    let total_states: Int
    let coverage_score: Double
    let staleness_score: Double
    let crawl_in_progress: Bool
}

@MainActor
final class CometAppState: ObservableObject {
    // ── Instruction State ──────────────────────────────────────────────────
    @Published var targetURL: String = ""
    @Published var instruction: String = ""
    @Published var autonomyMode: String = "supervised"  // supervised | autonomous

    // ── Execution State ────────────────────────────────────────────────────
    @Published var phase: ExecutionPhase = .idle
    @Published var activeNodeID: String? = nil
    @Published var events: [ExecutionEvent] = []
    @Published var smgHit: Bool = false
    @Published var modeUsed: String? = nil
    @Published var preflightVerdict: String? = nil
    @Published var errorMessage: String? = nil

    // ── SMG State ──────────────────────────────────────────────────────────
    @Published var coverage: SMGCoverage? = nil

    // ── UI State ───────────────────────────────────────────────────────────
    @Published var isImmersiveOpen: Bool = false
    @Published var currentView: String = "browser"  // browser | topology | immersive

    // ── Computed ───────────────────────────────────────────────────────────
    var coveragePct: Int { Int((coverage?.coverage_score ?? 0) * 100) }
    var isExecuting: Bool { ![ExecutionPhase.idle, .complete, .blocked].contains(phase) }

    func appendEvent(_ event: ExecutionEvent) {
        events.append(event)
        if events.count > 200 { events.removeFirst() }
        if let nodeID = event.node_id { activeNodeID = nodeID }
        switch event.type {
        case "node_start":    phase = .executing
        case "plan_complete": phase = .complete
        case "blocked":       phase = .blocked
        default: break
        }
    }

    func reset() {
        events = []
        activeNodeID = nil
        phase = .idle
        smgHit = false
        modeUsed = nil
        preflightVerdict = nil
        errorMessage = nil
    }
}
