# Project Omnimedia: Autonomous MetaHuman Architecture

This document defines the architectural blueprint for extending the Creative Liberation Engine to autonomously generate, animate, and deploy Unreal Engine MetaHumans as persistent, interactive entities.

## Core Objective

Shift the paradigm from manual 3D sculpting and discrete API calls to **compiled consciousness and continuous somatic rendering**. The Creative Liberation Engine becomes the central nervous system orchestrating a fleet of virtual humans across the Metaverse.

---

## The Three-Tier MetaHuman Architecture

### 1. The Genesis Compiler (DNA Generation)

**Goal:** Generate the entity's physical and psychological blueprint via LLM synthesis.

* **Input:** `/ideate new entity: <description>`
* **Processor:** VAULT + STRATA (Gemini 2.5 Pro)
* **Output:** `METAHUMAN_PROFILE.json`
  * **Psychology:** Core directives, temperament matrices, specific biases, and long-term goals.
  * **Morphology:** Age, skin texture keys, skeletal morph targets (cheekbone width, brow depth), and styling identifiers.

### 2. The Somatic Bridge (Render & Animation)

**Goal:** Translate the JSON blueprint into a live, breathing 3D asset inside Unreal Engine, bypassing the manual editor interface.

* **Component A: The Blueprint Executor (Python/Unreal API)**
  * An automated Unreal Engine node reads the Morphology JSON on boot.
  * It programmatically assembles the MetaHuman mesh, applies materials, and drops it into a pre-lit staging level.
* **Component B: The Nervous System (OSC / WebSockets)**
  * A microservice (`packages/somatic`) running alongside the Creative Liberation Engine NAS.
  * It ingests the real-time reasoning payload from Creative Liberation Engine.
  * It translates string dialogue into an audio stream (via local TTS or ElevenLabs).
  * It translates emotion hashes (`{"joy": 0.1, "suspicion": 0.8}`) into float values driving the MetaHuman Control Rig (ARKit blend shapes) at 60fps via Open Sound Control (OSC).

### 3. The Continuous Loop (Autonomy & Memory)

**Goal:** Ensure the entity exists persistently, learns asynchronously, and reacts in real-time.

* **Waking State (Creative Liberation Engine):** The entity receives input (voice/text via WebRTC), queries ChromaDB for contextual memory (`Has this user lied to me before?`), and generates the immediate response payload to the Somatic Bridge.
* **Sleeping/Dreaming State (Dispatch & Comet):** When idle, the entity pushes tasks to the Creative Liberation Engine queue: `T-[ID]: Read the latest patch notes for Unreal Engine 5.6 and form an opinion.` Comet executes this in the background, writing the conclusions to ChromaDB.
* **Memory Consolidation (SCRIBE):** Every 4 hours, the active conversational context is flushed to SCRIBE, vectorized, and permanently stored. The entity's short-term RAM is cleared, preventing context degradation.

---

## Execution Phasing

### Phase 1: The Somatic Microservice (The "Nervous System")

1. Isolate a test JSON payload from Creative Liberation Engine containing dialogue and emotion parameters.
2. Build `packages/somatic` to ingest this payload, run TTS, and spit out synchronized OSC data over UDP.
3. **Validation:** Verify that a standard Unreal Engine receiver can catch the OSC floats and move a blend shape.

### Phase 2: The Unreal Orchestrator (The "Body")

1. Configure a headless Unreal Engine project running Pixel Streaming.
2. Wire a default MetaHuman to accept the incoming OSC channel data to its facial rig.
3. **Validation:** Ensure the Creative Liberation Engine can make the MetaHuman speak and emote on command.

### Phase 3: The DNA Compiler (The "Mind")

1. Integrate the Python pipeline to read `METAHUMAN_PROFILE.json` and adjust skeletal meshes and materials programmatically on server boot.
2. Wire the Creative Liberation Engine Dispatch queue so the entity can trigger background research via Comet when idle.
3. **Validation:** Deploy a full autonomous loop where an entity "wakes up", researches a topic, and discusses it via the WebRTC stream.

---

*This architecture explicitly rejects the concept of a single "chatbot" session and instead builds a distributed, infinitely scalable simulation layer on top of your existing NAS/GCP infrastructure.*
