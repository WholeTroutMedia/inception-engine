# RESEARCH: Sub-200ms Audio-to-Animation (Viseme) Protocols

Task: T20260307-599 | Priority: P2 | Agent: comet-browser
Date: 2026-03-07

## Executive Summary

For real-time TTS-to-facial-animation in the IECR Omnimedia pipeline, Nvidia Audio2Face via its Authoring Microservice (Docker) is the most production-ready option. It outputs ARKit 52 blendshape weights directly, achievable at 30 FPS with async requests, and integrates via gRPC/HTTP. For lower-latency local alternatives, open-source text-to-viseme models generating OSC data are viable but less mature.

## Option Analysis

### Nvidia Audio2Face 3D Authoring Microservice — RECOMMENDED

- **What**: Docker microservice that converts audio streams to ARKit 52 blendshape weights
- **Latency**: ~100ms per request. At 30 FPS async, achieves real-time with slight visual delay
- **Output**: 52 ARKit blendshape float values (0.0-1.0) per frame
- **Transport**: gRPC or HTTP REST API
- **Known limitation**: Sequential requests cap at ~10 FPS. Must use async pipeline for 30 FPS
- **GPU required**: Yes (NVIDIA GPU with CUDA)
- **Deployment**: Docker container on NAS with GPU passthrough
- **Integration**: Audio in -> blendshape weights out -> OSC UDP to UE5

### Open-Source Text-to-Viseme (Local Models)

- **Wav2Vec2 + Viseme Mapping**: Audio features to viseme classification
- **Latency**: 20-50ms per chunk (faster than Audio2Face)
- **Output**: 15 standard viseme categories (not full ARKit 52)
- **Trade-off**: Fewer blendshapes = less expressive, but much faster
- **Mapping**: Viseme categories must be mapped to ARKit blendshapes manually

### ARKit Live Capture (iPhone/iPad)

- **What**: Real-time face tracking via TrueDepth camera
- **Latency**: <16ms (60 FPS native)
- **Output**: Full ARKit 52 blendshapes + head rotation + eye gaze
- **Transport**: UDP broadcast (standard ARKit face streaming protocol)
- **Use case**: Live performance capture, not AI-driven generation
- **Tools**: Live Link Face app, custom ARKit apps

## Protocol: ARKit 52 Blendshapes via OSC/UDP

### The 52 Blendshapes:
The standard set includes: eyeBlinkLeft, eyeBlinkRight, eyeSquintLeft, eyeSquintRight, eyeWideLeft, eyeWideRight, eyeLookDownLeft, eyeLookDownRight, eyeLookInLeft, eyeLookInRight, eyeLookOutLeft, eyeLookOutRight, eyeLookUpLeft, eyeLookUpRight, jawForward, jawLeft, jawRight, jawOpen, mouthClose, mouthFunnel, mouthPucker, mouthLeft, mouthRight, mouthSmileLeft, mouthSmileRight, mouthFrownLeft, mouthFrownRight, mouthDimpleLeft, mouthDimpleRight, mouthStretchLeft, mouthStretchRight, mouthRollLower, mouthRollUpper, mouthShrugLower, mouthShrugUpper, mouthPressLeft, mouthPressRight, mouthLowerDownLeft, mouthLowerDownRight, mouthUpperUpLeft, mouthUpperUpRight, browDownLeft, browDownRight, browInnerUp, browOuterUpLeft, browOuterUpRight, cheekPuff, cheekSquintLeft, cheekSquintRight, noseSneerLeft, noseSneerRight, tongueOut.

### OSC Message Format:
```
/blendshapes [f32 x 52]  -- all 52 values in one UDP packet
/head/rotation [f32 yaw] [f32 pitch] [f32 roll]
/eyes/gaze [f32 leftYaw] [f32 leftPitch] [f32 rightYaw] [f32 rightPitch]
```

### UDP Packet Size:
- 52 floats x 4 bytes = 208 bytes per blendshape frame
- At 30 FPS = ~6.24 KB/s bandwidth (trivial)
- At 60 FPS = ~12.48 KB/s bandwidth (still trivial)

## Recommendation for IE Somatic Bridge

### Architecture:
```
TTS Engine (text -> audio stream)
    |
    v
Audio2Face Microservice (Docker, GPU)
    |
    v
ARKit 52 blendshape weights (gRPC)
    |
    v
IE Somatic Bridge (Node.js)
    |
    +-- OSC/UDP --> UE5 Headless (SetMorphTarget per blendshape)
    +-- WebSocket --> NEXUS Browser UI (face preview)
```

### Latency Budget:
- TTS generation: ~200ms (streaming reduces perceived latency)
- Audio2Face processing: ~100ms (async pipeline)
- OSC UDP transmission: <1ms (local network)
- UE5 morph target application: <1ms
- **Total pipeline**: ~300ms end-to-end (acceptable for non-interactive)
- **For interactive**: Pre-buffer TTS, stream audio chunks to Audio2Face

### Constraints:
1. Audio2Face requires NVIDIA GPU (NAS has GPU passthrough capability)
2. Docker deployment with CUDA runtime
3. Async request pattern mandatory for 30 FPS (sequential = 10 FPS)
4. ARKit blendshape naming must match UE5 MetaHuman morph target names
5. Head rotation and eye gaze need separate OSC channels

## What Won't Work:
- Audio2Face with sequential requests (10 FPS, too choppy)
- Pure viseme-based approach (15 categories too few for realistic faces)
- WebSocket for blendshape streaming (UDP is lower latency, more appropriate)

## Sources
- Nvidia Audio2Face 3D Authoring Microservice documentation
- Nvidia ACE performance troubleshooting guide
- ARKit face tracking blendshape specification (Apple)
- Godot ARKit facial mocap implementation examples
- Community reports on Audio2Face latency characteristics