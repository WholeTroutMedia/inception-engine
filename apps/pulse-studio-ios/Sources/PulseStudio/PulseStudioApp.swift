import SwiftUI

@main
struct PulseStudioApp: App {
    @State private var qwenEngine = QwenInferenceEngine()

    var body: some Scene {
        WindowGroup {
            LiveFeedCanvasView()
                .environment(qwenEngine)
                // "Liquid Glass" global configuration (SwiftUI 5.0)
                .preferredColorScheme(.dark)
                .tint(Color(hex: "EAB308")) // Optic yellow tactical
        }
    }
}

// Helper for Hex Colors
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        _ = scanner.scanString("#")
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
