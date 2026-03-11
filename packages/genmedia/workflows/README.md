# Hollywood VFX ComfyUI Workflow Library (Full Studio Suite)

This directory contains production-ready ComfyUI workflows (in JSON format) designed for high-end cinematic and VFX pipelines. The Creative Liberation Engine orchestrates these workflows automatically, creating a state-of-the-art "creative liberation platform" without shortcuts or compromises.

## The 12-Pipeline Library

### Pre-Production & Concept

* **`01-storyboard-sketch.json`** - Rapid visualization of scenes from script text. (SDXL Turbo + ControlNet Scribble). Fast 4-step generation for real-time collaboration.
* **`02-environment-concept.json`** - High-resolution establishing shots and mood boards. (SDXL + Depth ControlNet) ensuring perfect scale and structural integrity.
* **`03-high-fidelity-character.json`** - Photorealistic, high-resolution rendering of consistent characters across multiple angles. (Flux.1-Dev + IP-Adapter + Reactor Face-Swap).

### Animation & Motion

* **`04-motion-previz-wan.json`** - Translating keyframes into fluid video clips for cinematic pre-visualization. (Wan 2.1 1.3B/14B + VideoCombine) enforcing temporal consistency.
* **`05-animate-anyone-dance.json`** - Full body motion transfer from reference video onto character concepts. (Moore-AnimateAnyone / Pose ControlNet).
* **`06-lipsync-dialogue.json`** - Audio-driven precise mouth movement and facial expression mapping. (Wav2Lip / SadTalker wrapper nodes).

### VFX & Post-Production

* **`07-vfx-green-screen-plate.json`** - Generation of perfectly isolated, transparent assets with embedded alpha channels. (LayerDiffuse + SDXL).
* **`08-style-transfer-anime.json`** - Complex multi-pass styling converting live-action into premium 2D animation. (Flux + Anime LoRA + multi-ControlNet).
* **`09-product-shot-commercial.json`** - Commercial-grade studio lighting manipulation over existing 3D models or masks. (IC-Light + SDXL).
* **`10-ultimate-upscale.json`** - Taking raw generated frames/video and upscaling to 4K cinematic delivery quality. (SUPIR / Ultimate SD Upscale + Tile ControlNet + Film Grain Injection).

### 3D & Audio Assets

* **`11-text-to-3d-asset.json`** - Automated topology generation from 2D character/prop concepts. (TripoSR / CRM node wrappers).
* **`12-audio-sfx-generation.json`** - Generating Foley, SFX, and ambient room tone based on the visual context of the shot. (AudioLDM2 / Stable Audio nodes).

---

## 🚀 Orchestration via Creative Liberation Engine

The `genmedia` package dynamically references these files. When a user requests a high-quality video or an upscale via the Creative Liberation Engine, the corresponding JSON is sent to the local `host.docker.internal:8188` ComfyUI endpoint.

*Note: Required custom nodes (like WanVideo, IP-Adapter-Plus, SUPIR, LayerDiffuse, TripoSR) must be installed via the ComfyUI Manager on the host machine.*
