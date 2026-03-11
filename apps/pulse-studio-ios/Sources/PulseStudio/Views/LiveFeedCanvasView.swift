import SwiftUI

struct LiveFeedCanvasView: View {
    @Environment(QwenInferenceEngine.self) var qwenEngine
    @State private var pulseOpacity = 0.5
    
    var body: some View {
        ZStack {
            // Background Liquid Glass
            Color.black.ignoresSafeArea()
            
            VStack {
                // Header
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(Color(hex: "EAB308"))
                    Text("PULSE STUDIO / FIELD OPS")
                        .font(.system(size: 14, weight: .heavy, design: .monospaced))
                        .foregroundStyle(.white)
                    Spacer()
                    
                    HStack(spacing: 8) {
                        Circle()
                            .fill(qwenEngine.isModelLoaded ? Color(hex: "EAB308") : .red)
                            .frame(width: 8, height: 8)
                            .opacity(pulseOpacity)
                            .animation(.easeInOut(duration: 1.0).repeatForever(), value: pulseOpacity)
                        
                        Text(qwenEngine.isModelLoaded ? "QWEN_0.8B ONLINE" : "BOOTING ENGINE...")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundStyle(qwenEngine.isModelLoaded ? Color(hex: "EAB308") : .gray)
                    }
                    .padding(8)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 4))
                }
                .padding(.horizontal)
                .padding(.top, 16)
                
                Spacer()
                
                // Camera Viewfinder Simulation
                ZStack {
                    Rectangle()
                        .strokeBorder(Color(white: 0.2), lineWidth: 1)
                        .background(Color.black.opacity(0.3))
                    
                    // Viewfinder corners
                    VStack {
                        HStack {
                            Path { path in
                                path.move(to: CGPoint(x: 0, y: 20))
                                path.addLine(to: CGPoint(x: 0, y: 0))
                                path.addLine(to: CGPoint(x: 20, y: 0))
                            }
                            .stroke(Color(hex: "EAB308"), lineWidth: 2)
                            .frame(width: 20, height: 20)
                            Spacer()
                            Path { path in
                                path.move(to: CGPoint(x: -20, y: 0))
                                path.addLine(to: CGPoint(x: 0, y: 0))
                                path.addLine(to: CGPoint(x: 0, y: 20))
                            }
                            .stroke(Color(hex: "EAB308"), lineWidth: 2)
                            .frame(width: 20, height: 20)
                        }
                        Spacer()
                        HStack {
                            Path { path in
                                path.move(to: CGPoint(x: 0, y: -20))
                                path.addLine(to: CGPoint(x: 0, y: 0))
                                path.addLine(to: CGPoint(x: 20, y: 0))
                            }
                            .stroke(Color(hex: "EAB308"), lineWidth: 2)
                            .frame(width: 20, height: 20)
                            Spacer()
                            Path { path in
                                path.move(to: CGPoint(x: -20, y: 0))
                                path.addLine(to: CGPoint(x: 0, y: 0))
                                path.addLine(to: CGPoint(x: 0, y: -20))
                            }
                            .stroke(Color(hex: "EAB308"), lineWidth: 2)
                            .frame(width: 20, height: 20)
                        }
                    }
                    .padding(-1)
                    
                    Image(systemName: "camera.aperture")
                        .font(.system(size: 48, weight: .ultraLight))
                        .foregroundStyle(Color.white.opacity(0.2))
                }
                .aspectRatio(9/16, contentMode: .fit)
                .padding(.horizontal, 32)
                .padding(.vertical, 16)
                
                Spacer()
                
                // On-Device MLX Console
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "cpu")
                            .font(.system(size: 14))
                        Text("LOCAL ASSESS /// MLX")
                            .font(.system(size: 12, weight: .black, design: .monospaced))
                        Spacer()
                        
                        if qwenEngine.isThinking {
                            ProgressView()
                                .tint(Color(hex: "EAB308"))
                                .scaleEffect(0.6)
                        } else {
                            Text("\(qwenEngine.liveTokensProcessed) TOKENS")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(Color(white: 0.5))
                        }
                    }
                    .foregroundStyle(Color(hex: "EAB308"))
                    
                    ZStack(alignment: .topLeading) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(hex: "EAB308").opacity(0.05))
                            .strokeBorder(Color(hex: "EAB308").opacity(0.3), lineWidth: 1)
                        
                        if qwenEngine.latestInsight.isEmpty {
                            Text("AWAITING PULL...")
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundStyle(Color.white.opacity(0.3))
                                .padding()
                        } else {
                            Text(qwenEngine.latestInsight)
                                .font(.system(size: 14, weight: .medium, design: .monospaced))
                                .foregroundStyle(.white)
                                .padding()
                        }
                    }
                    .frame(height: 100)
                    
                    Button(action: {
                        Task {
                            await qwenEngine.synthesizeTelemetry(player: "S.CURRY (30)", hr: 168, pts: 32)
                        }
                    }) {
                        HStack {
                            Image(systemName: "waveform.path.ecg")
                            Text("TRIGGER APPLE SILICON QWEN INFERENCE")
                        }
                        .font(.system(size: 12, weight: .heavy, design: .monospaced))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(qwenEngine.isModelLoaded && !qwenEngine.isThinking ? Color.white : Color(white: 0.2))
                        .foregroundStyle(qwenEngine.isModelLoaded && !qwenEngine.isThinking ? Color.black : .gray)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    .disabled(!qwenEngine.isModelLoaded || qwenEngine.isThinking)
                }
                .padding()
                .background(.ultraThinMaterial) // Liquid Glass
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
        }
        .onAppear {
            pulseOpacity = 1.0
        }
    }
}
