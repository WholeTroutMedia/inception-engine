# Project Omnimedia: The Sapling Phase

The foundation is cracked. We have the orchestration engine (Creative Liberation Engine), the autonomous dispatch queue, and the persistent memory (SCRIBE). To grow this into a mature Agentic OS capable of manipulating any creative software, we must build the **Trunk** (infrastructure) carefully before branching out.

---

## 🌳 The Trunk (Immediate Structural Additions)

To make other software act as native APIs, we need three core additions to the Creative Liberation Engine:

### 1. The Headless Render Farm (NAS/GCP)

Right now, you open software on your desktop. We need to transition to **Headless Rendering**.
We need dedicated containers/VMs on the NAS or GCP that run Unreal Engine, Blender, or REAPER entirely in the background without a GUI, listening purely for UDP/TCP commands from the Creative Liberation Engine.

### 2. The Universal Creative Protocol (UCP Schema)

We need a strict, open-source JSON schema that Creative Liberation Engine outputs. It must define time (`frames`, `bpm`), space (`coordinates`, `scale`), and aesthetics (`prompts`, `moods`).
A standard payload must be digestible by any MCP Driver (e.g., parsing a `UCP.Timeline` object into an Adobe Premiere XML).

### 3. The Bi-Directional Sensory Bus (WebRTC)

For interactive entities (MetaHumans), JSON isn't enough. We need a low-latency streaming bus. The engine must natively ingest microphone audio, transcribe it to text for Creative Liberation Engine, and instantly beam out OSC control data and rendered WebRTC video back to the user.

---

## 🌿 The Branches (Comet Research Epics)

To build the trunk, we need exact, ground-truth data on the current state of these external software APIs. I have dispatched Comet to execute deep-dive research into the following three critical paths.

### Epoch 1: The Visual API (Unreal Engine 5)

* **Target:** How deeply can we manipulate UE5 without opening the editor?
* **Scope:** Researching Epic Games' Python API, Control Rig programmatic access, and the stability of Pixel Streaming in headless Linux containers.

### Epoch 2: The Auditory API (DAW Automation)

* **Target:** Procedural generation of mixed, mastered, beat-synced audio.
* **Scope:** We cannot click buttons in Ableton. Comet will research REAPER's ReaScript API (notoriously the best for headless automation), Max4Live CLI execution, and C++ audio engines like Tracktion.

### Epoch 3: The Somatic Translation (Audio-to-Animation)

* **Target:** Sub-200ms latency for live MetaHuman lip-sync.
* **Scope:** Researching Nvidia Audio2Face local deployment, open-source text-to-viseme models, and real-time OSC streaming protocols.

---
*Once Comet returns these research payloads to SCRIBE, Creative Liberation Engine will possess the precise technical knowledge required to build the first MCP Driver.*
