// SpatialBrowserView.swift
// The primary 2D-in-space browser UI for COMET on visionOS
// Warm Trichromatic design language: copper/charcoal/amber
//
// Layout:
//   ┌─── URL bar ────────────────────────────────────┐
//   │ ◉ COMET   [url input]  [EXECUTE] [TOPOLOGY]    │
//   ├─── SMG Coverage strip ─────────────────────────┤
//   │ SMG: 78%  states: 42  stale: 12%  ⟳ crawling  │
//   ├─── Left: Instruction ──┬── Right: Event log ─── │
//   │ Instruction textarea   │ Execution stream       │
//   │ [Supervised/Auto]      │ node_start ...         │
//   │ [▶ EXECUTE]            │ node_complete ...      │
//   └────────────────────────┴───────────────────────┘

import SwiftUI
import RealityKit

// ── Warm Trichromatic Design Tokens ──────────────────────────────────────────
private enum Copper {
    static let primary   = Color(red: 0.91, green: 0.38, blue: 0.10) // #E8621A
    static let secondary = Color(red: 0.72, green: 0.23, blue: 0.16) // #B83B28
    static let warm      = Color(red: 0.69, green: 0.43, blue: 0.20) // #B06E32
    static let muted     = Color(red: 0.35, green: 0.29, blue: 0.23) // #5A4A3A
    static let bg        = Color(red: 0.06, green: 0.05, blue: 0.04) // #0F0C0A
    static let bgMid     = Color(red: 0.10, green: 0.07, blue: 0.05) // #1A1210
    static let text      = Color(red: 0.78, green: 0.72, blue: 0.66) // #C8B8A8
}

// ── Lynch Type Display ────────────────────────────────────────────────────────
private let lychColors: [String: Color] = [
    "landmark": Copper.primary,
    "node":     Copper.secondary,
    "district": Copper.warm,
    "path":     Copper.muted,
    "edge":     Color.gray,
]

// ── SMG Coverage Strip ────────────────────────────────────────────────────────
struct CoverageBanner: View {
    let coverage: SMGCoverage?

    var body: some View {
        HStack(spacing: 20) {
            if let cov = coverage {
                banner("SMG", value: cov.exists ? "\(Int(cov.coverage_score * 100))%" : "UNMAPPED",
                        color: cov.exists ? Copper.primary : Copper.muted)
                banner("states", value: "\(cov.total_states)", color: Copper.text)
                banner("stale", value: "\(Int(cov.staleness_score * 100))%",
                        color: cov.staleness_score > 0.5 ? Copper.secondary : Copper.muted)
                if cov.crawl_in_progress {
                    Text("⟳ crawling").font(.system(size: 10, design: .monospaced))
                        .foregroundColor(Copper.warm)
                }
            } else {
                Text("SMG: UNMAPPED").font(.system(size: 10, design: .monospaced))
                    .foregroundColor(Copper.muted)
            }
            Spacer()
        }
        .padding(.horizontal, 16).padding(.vertical, 8)
        .background(Color.black.opacity(0.6))
    }

    @ViewBuilder
    private func banner(_ label: String, value: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Text(label).font(.system(size: 9, design: .monospaced)).foregroundColor(Copper.muted)
            Text(value).font(.system(size: 10, design: .monospaced)).foregroundColor(color)
        }
    }
}

// ── Instruction Panel (Left column) ──────────────────────────────────────────
struct InstructionPanel: View {
    @EnvironmentObject var state: CometAppState
    @EnvironmentObject var bridge: SMGBridge
    @State private var isExecuting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("TARGET URL")
            TextField("https://example.com", text: $state.targetURL)
                .textFieldStyle(.plain)
                .font(.system(size: 13, design: .monospaced))
                .foregroundColor(Copper.text)
                .padding(10)
                .background(Copper.bgMid)
                .cornerRadius(4)
                .padding(.horizontal, 16).padding(.bottom, 12)
                .onSubmit { updateDomain() }

            sectionLabel("INSTRUCTION")
            TextEditor(text: $state.instruction)
                .frame(minHeight: 120)
                .font(.system(size: 13, design: .monospaced))
                .foregroundColor(Copper.text)
                .scrollContentBackground(.hidden)
                .background(Copper.bgMid)
                .cornerRadius(4)
                .padding(.horizontal, 16).padding(.bottom, 12)

            sectionLabel("MODE")
            HStack(spacing: 8) {
                ForEach(["supervised", "autonomous"], id: \.self) { mode in
                    Button(mode.uppercased()) {
                        state.autonomyMode = mode
                    }
                    .buttonStyle(CompactToggleStyle(isActive: state.autonomyMode == mode))
                }
            }
            .padding(.horizontal, 16).padding(.bottom, 16)

            Button {
                Task { await executeTask() }
            } label: {
                HStack {
                    Spacer()
                    Text(state.isExecuting ? "⟳ EXECUTING..." : "▶ EXECUTE")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                    Spacer()
                }
                .padding(.vertical, 12)
                .background(state.isExecuting ? Color.black.opacity(0.4) : Copper.primary)
                .cornerRadius(4)
            }
            .disabled(state.isExecuting || state.instruction.trimmingCharacters(in: .whitespaces).isEmpty)
            .padding(.horizontal, 16).padding(.bottom, 12)

            // Result summary
            if let verdict = state.preflightVerdict {
                resultRow("PREFLIGHT", value: verdict,
                            color: verdict == "APPROVED" ? .green : verdict == "BLOCKED" ? Copper.secondary : Copper.warm)
            }
            if let mode = state.modeUsed {
                resultRow("MODE", value: mode.uppercased(), color: Copper.muted)
            }
            if state.smgHit {
                resultRow("SMG", value: "HIT", color: Copper.primary)
            }
            if let err = state.errorMessage {
                Text(err).font(.system(size: 11, design: .monospaced))
                    .foregroundColor(Copper.secondary).padding(.horizontal, 16)
            }

            Spacer()
        }
        .padding(.top, 12)
        .frame(maxWidth: 360)
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text).font(.system(size: 9, design: .monospaced))
            .foregroundColor(Copper.muted).tracking(1.5)
            .padding(.horizontal, 16).padding(.bottom, 6)
    }

    private func resultRow(_ label: String, value: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Text(label).font(.system(size: 9, design: .monospaced)).foregroundColor(Copper.muted)
            Text(value).font(.system(size: 10, design: .monospaced)).foregroundColor(color)
        }
        .padding(.horizontal, 16).padding(.bottom, 4)
    }

    private func updateDomain() {
        guard let host = URL(string: state.targetURL)?.host else { return }
        Task { state.coverage = await bridge.fetchCoverage(domain: host) }
    }

    private func executeTask() async {
        state.reset()
        bridge.connect()
        do {
            let result = try await bridge.execute(
                url: state.targetURL,
                instruction: state.instruction,
                autonomy: state.autonomyMode
            )
            if let sm = result["smg_hit"] as? Bool { state.smgHit = sm }
            if let mu = result["mode_used"] as? String { state.modeUsed = mu }
            if let pf = result["preflight"] as? [String: Any],
               let v = pf["verdict"] as? String { state.preflightVerdict = v }
            if let err = result["error"] as? String { state.errorMessage = err }
        } catch {
            state.errorMessage = error.localizedDescription
        }
    }
}

// ── Execution Event Log (right column) ───────────────────────────────────────
struct ExecutionLog: View {
    @EnvironmentObject var state: CometAppState

    private let typeColors: [String: Color] = [
        "node_start":    Copper.warm,
        "node_complete": .green,
        "node_failed":   Copper.secondary,
        "node_repaired": Color(red: 0.55, green: 0.76, blue: 0.29),
        "plan_complete": Copper.primary,
        "connected":     .teal,
        "disconnected":  Color.gray,
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("EXECUTION STREAM")
                .font(.system(size: 9, design: .monospaced))
                .foregroundColor(Copper.muted).tracking(1.5)
                .padding(.horizontal, 16).padding(.vertical, 10)

            if state.events.isEmpty {
                Spacer()
                Text("Awaiting connection...").font(.system(size: 12, design: .monospaced))
                    .foregroundColor(Copper.muted).frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 3) {
                            ForEach(state.events) { evt in
                                HStack(alignment: .top, spacing: 8) {
                                    Text(String(evt.timestamp.dropFirst(11).prefix(8)))
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(Copper.muted)
                                    Text(evt.type.uppercased())
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(typeColors[evt.type] ?? Copper.text)
                                    if let desc = evt.description {
                                        Text(desc).font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(Copper.text).lineLimit(2)
                                    }
                                    if let err = evt.error {
                                        Text("✕ \(err)").font(.system(size: 10, design: .monospaced))
                                            .foregroundColor(Copper.secondary).lineLimit(1)
                                    }
                                }
                                .id(evt.id)
                            }
                        }
                        .padding(.horizontal, 12)
                    }
                    .onChange(of: state.events.count) { _ in
                        if let last = state.events.last { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// ── Button Style ─────────────────────────────────────────────────────────────
struct CompactToggleStyle: ButtonStyle {
    let isActive: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 10, design: .monospaced))
            .padding(.horizontal, 12).padding(.vertical, 5)
            .background(isActive ? Copper.primary.opacity(0.3) : Color.clear)
            .foregroundColor(isActive ? Copper.primary : Copper.muted)
            .cornerRadius(3)
            .overlay(RoundedRectangle(cornerRadius: 3)
                .stroke(isActive ? Copper.primary : Copper.muted.opacity(0.4), lineWidth: 1))
    }
}

// ── Main Spatial Browser View ─────────────────────────────────────────────────
struct SpatialBrowserView: View {
    @EnvironmentObject var state: CometAppState
    @EnvironmentObject var bridge: SMGBridge
    @Environment(\.openImmersiveSpace) var openImmersiveSpace
    @Environment(\.dismissImmersiveSpace) var dismissImmersiveSpace

    var body: some View {
        VStack(spacing: 0) {
            // ── Header bar ──────────────────────────────────────────────────
            HStack(spacing: 16) {
                Text("◉ COMET").font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(Copper.primary)
                Text("SOVEREIGN SPATIAL INTELLIGENCE LAYER")
                    .font(.system(size: 9, design: .monospaced)).foregroundColor(Copper.muted).tracking(1)
                Spacer()

                // Autonomy indicator
                Circle().fill(state.autonomyMode == "autonomous" ? Color.orange : Color.green)
                    .frame(width: 6, height: 6)
                Text(state.autonomyMode.uppercased())
                    .font(.system(size: 9, design: .monospaced)).foregroundColor(Copper.muted)

                // Immersive toggle
                Button {
                    Task {
                        if state.isImmersiveOpen {
                            await dismissImmersiveSpace()
                            state.isImmersiveOpen = false
                        } else {
                            await openImmersiveSpace(id: "comet-immersive")
                            state.isImmersiveOpen = true
                        }
                    }
                } label: {
                    Text(state.isImmersiveOpen ? "⊟ EXIT SPATIAL" : "⊞ ENTER SPATIAL")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(state.isImmersiveOpen ? Copper.secondary : Copper.primary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20).padding(.vertical, 12)
            .background(Color.black.opacity(0.7))

            // ── SMG Coverage strip ──────────────────────────────────────────
            CoverageBanner(coverage: state.coverage)
                .frame(height: 36)

            Divider().background(Copper.muted.opacity(0.2))

            // ── Main body ───────────────────────────────────────────────────
            HStack(spacing: 0) {
                InstructionPanel()
                Divider().background(Copper.muted.opacity(0.2))
                ExecutionLog()
            }
        }
        .background(Copper.bg)
        .glassBackgroundEffect()
    }
}
