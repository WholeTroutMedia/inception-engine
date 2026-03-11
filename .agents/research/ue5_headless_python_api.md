# RESEARCH: UE5 Headless Python API Constraints

> Task: T20260307-793 | Priority: P1 | Agent: comet-browser
> Date: 2026-03-07

## Executive Summary

UE5 CAN run headless with Python scripting, but with significant constraints. The key finding: **skeletal mesh generation, shape key control, and Pixel Streaming all work headless**, but through different API surfaces that must be composed carefully.

## Three Headless Execution Modes

### Mode 1: Commandlet (No Editor, No Rendering)
```
UnrealEditor-Cmd.exe "Project.uproject" -run=pythonscript -script="my_script.py"
```
- Runs headless, no editor UI
- Has access to `unreal` Python module
- Can WRITE to project (import/create assets)
- CANNOT read loaded levels or assets already in memory
- Shuts down after script completes
- Best for: batch asset import, skeletal mesh generation, FBX processing

### Mode 2: -RenderOffscreen (Headless with GPU Rendering)
```
UnrealEditor-Cmd.exe "Project.uproject" -RenderOffscreen -ForceRes=1920x1080
```
- No visible window on the host machine
- GPU rendering STILL HAPPENS (required for Pixel Streaming)
- Requires Vulkan (Linux) or D3D12 (Windows)
- NOT supported on Metal/macOS
- Best for: Pixel Streaming deployment, remote control

### Mode 3: -nullrhi (Truly Headless, No GPU)
```
UnrealEditor-Cmd.exe "Project.uproject" -nullrhi
```
- Disables the renderer entirely
- No RenderTarget resources available
- Cannot do Pixel Streaming
- Best for: dedicated servers, data processing only

## Can We Generate Skeletal Meshes via Python?

**YES** -- via two approaches:

### Approach A: FBX Import Pipeline (Recommended)
Using `unreal.AssetImportTask` + `unreal.FbxImportUI`:
- Set `import_as_skeletal = True`
- Set `import_morph_targets = True` for blendshapes
- Fully automatable in Commandlet mode
- Supports batch import with progress tracking

### Approach B: UnrealEnginePython Plugin (Programmatic)
Using `skeleton.skeleton_add_bone()` + `SkeletalMesh.skeletal_mesh_build_lod()`:
- Create skeletons and skeletal meshes entirely from Python
- Full control over bone hierarchy, vertex weights, materials
- More complex but enables procedural mesh generation

## Can We Control Shape Keys / Blendshapes?

**YES** -- UE5 calls them "Morph Targets":

- Import via FBX with `import_morph_targets = True`
- ARKit 52 blendshape names map directly to UE5 morph targets
- Runtime control via `SetMorphTarget(name, value)` on SkeletalMeshComponent
- UE 5.7+ has new in-engine Morph Target plugin (sculpt directly, no DCC needed)
- Sequencer can drive morph targets for animation
- Control Rig can automate morph target animation pipelines

## Can We Trigger Pixel Streaming Headless?

**YES** -- with `-RenderOffscreen`:
```
UnrealEditor-Cmd.exe "Project.uproject" \
  -RenderOffscreen \
  -EditorPixelStreamingStartOnLaunch=true \
  -EditorPixelStreamingRes=1920x1080 \
  -PixelStreamingURL=ws://127.0.0.1:8888
```

### Known Issues:
- On cloud VMs (AWS EC2), Remote Control API property changes may not reflect in viewport without camera movement
- Workaround: disable CPU throttling in DefaultEditorSettings.ini:
  ```
  bThrottleCPUWhenNotForeground=False
  bDisableRealtimeViewportsInRemoteSessions=False
  ```
- For console commands via Pixel Streaming, must add `-AllowPixelStreamingCommands`

## Remote Control API (HTTP Interface)

UE5's Remote Control API provides HTTP REST endpoints for external control:
- `PUT /remote/object/property` -- read/write any UObject property
- `PUT /remote/object/call` -- call any UFunction
- `PUT /remote/batch` -- batch multiple calls
- Works in headless mode with Pixel Streaming
- This is the primary IE integration point for the somatic bridge

## Recommendation for IE Omnimedia Pipeline

### Architecture:
```
IE Somatic Bridge (Node.js/OSC)
  |
  +-- Remote Control API (HTTP) --> UE5 Headless (-RenderOffscreen)
  |     - SetMorphTarget() for ARKit 52 blendshapes
  |     - Property writes for animation state
  |
  +-- Pixel Streaming (WebRTC) --> Browser/NEXUS UI
        - Real-time visual output
        - No local display needed on NAS
```

### Constraints to Accept:
1. GPU required on host (NAS has GPU profiles in docker-compose)
2. -RenderOffscreen needs Vulkan or D3D12 (Linux Vulkan on NAS)
3. Morph target import requires FBX pipeline (not real-time mesh generation)
4. Remote Control API is the cleanest external control surface
5. Commandlet mode for batch asset operations, -RenderOffscreen for runtime

### What Won't Work:
- No interactive Python REPL (commandlet exits after script)
- -nullrhi mode cannot do Pixel Streaming
- Metal/macOS not supported for -RenderOffscreen
- Some viewport refresh issues on cloud VMs (workarounds exist)

## Sources
- Epic Games: Pixel Streaming Reference (UE 5.6)
- Epic Games: Scripting the Unreal Editor Using Python
- Epic Games: Remote Control API HTTP Reference
- Epic Games: FBX Morph Target Pipeline
- Reddit r/UnrealEngine5: Headless UE5 client in pure Python (Feb 2026)
- UE Forums: Rendering in headless mode, Remote Control API viewport issues
- UE 5.7 Morph Target Plugin (Feb 2026)