// SMGBridge.swift
// Manages WebSocket connection to COMET service for real-time event streaming
// Also handles REST calls for SMG coverage and execution

import Foundation
import Combine

private let GATEWAY_URL = ProcessInfo.processInfo.environment["COMET_GATEWAY_URL"]
    ?? "http://localhost:3080"

@MainActor
final class SMGBridge: ObservableObject {
    var appState: CometAppState?

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession = .shared
    private var pingTimer: Timer?

    // ── Connection ──────────────────────────────────────────────────────────
    func connect() {
        let wsURL = GATEWAY_URL
            .replacingOccurrences(of: "http://", with: "ws://")
            .replacingOccurrences(of: "https://", with: "wss://")
        guard let url = URL(string: "\(wsURL)/comet/ws") else { return }

        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        listenForMessages()
        startPing()
    }

    func disconnect() {
        pingTimer?.invalidate()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
    }

    // ── Message Listener ──────────────────────────────────────────────────
    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            Task { @MainActor [weak self] in
                guard let self else { return }
                switch result {
                case .success(let message):
                    if case .string(let text) = message,
                       let data = text.data(using: .utf8),
                       let event = try? JSONDecoder().decode(ExecutionEvent.self, from: data) {
                        self.appState?.appendEvent(event)
                    }
                    self.listenForMessages()
                case .failure:
                    // Reconnect after short delay
                    try? await Task.sleep(nanoseconds: 3_000_000_000)
                    self.connect()
                }
            }
        }
    }

    // ── Ping Keepalive ────────────────────────────────────────────────────
    private func startPing() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.webSocketTask?.sendPing { _ in }
        }
    }

    // ── Execute Task ──────────────────────────────────────────────────────
    func execute(url: String, instruction: String, autonomy: String) async throws -> [String: Any] {
        guard let endpoint = URL(string: "\(GATEWAY_URL)/comet/execute") else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "url": url,
            "instruction": instruction,
            "autonomy": autonomy,
        ])
        let (data, _) = try await session.data(for: req)
        return (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }

    // ── Fetch SMG Coverage ────────────────────────────────────────────────
    func fetchCoverage(domain: String) async -> SMGCoverage? {
        guard !domain.isEmpty,
              let url = URL(string: "\(GATEWAY_URL)/ghost/smg/\(domain)/coverage") else { return nil }
        guard let (data, _) = try? await session.data(from: url) else { return nil }
        return try? JSONDecoder().decode(SMGCoverage.self, from: data)
    }

    // ── Trigger Crawl ─────────────────────────────────────────────────────
    func triggerCrawl(startURL: String) async {
        guard let url = URL(string: "\(GATEWAY_URL)/ghost/crawl") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["start_url": startURL])
        _ = try? await session.data(for: req)
    }
}
