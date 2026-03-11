// CometVisionApp.swift
// COMET Spatial Browser — visionOS Entry Point
// Creative Liberation Engine v5 | Phase G
//
// Architecture:
//   WindowGroup "browser"  → SpatialBrowserView (2D-in-space)
//   ImmersiveSpace "comet" → ImmersiveExecutionSpace (full spatial awareness)

import SwiftUI

@main
struct CometVisionApp: App {
    @StateObject private var appState = CometAppState()
    @StateObject private var smgBridge = SMGBridge()

    var body: some Scene {
        // ── Primary Browser Window ──────────────────────────────────────────
        WindowGroup(id: "browser") {
            SpatialBrowserView()
                .environmentObject(appState)
                .environmentObject(smgBridge)
                .onAppear { smgBridge.connect() }
                .onDisappear { smgBridge.disconnect() }
        }
        .windowStyle(.plain)
        .defaultSize(width: 1200, height: 800, depth: 0)

        // ── Secondary: Execution Monitor Panel ─────────────────────────────
        WindowGroup(id: "execution-monitor") {
            ExecutionMonitorView()
                .environmentObject(appState)
                .environmentObject(smgBridge)
        }
        .windowStyle(.plain)
        .defaultSize(width: 600, height: 700, depth: 0)

        // ── Immersive Space: Full Spatial Awareness ─────────────────────────
        // Activated when user switches to "cruising" mode
        ImmersiveSpace(id: "comet-immersive") {
            ImmersiveExecutionSpace()
                .environmentObject(appState)
                .environmentObject(smgBridge)
        }
        .immersionStyle(selection: .constant(.mixed), in: .mixed)
    }
}
