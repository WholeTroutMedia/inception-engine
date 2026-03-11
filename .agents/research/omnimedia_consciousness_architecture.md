# IECR Omnimedia Consciousness Architecture
## Research Brief — RESEARCH Agent

### Tier 1: Genesis Compiler
Converts natural-language MetaHuman descriptions into MetaHumanDNA structs.
Package: packages/genesis/
Key files: types.ts, compiler.ts, presets.ts
LLM parses description -> generates AppearanceParams, VoiceParams, PersonalityParams
Output: MetaHumanDNA object ready for UE5 MetaHuman Creator API

### Tier 2: Somatic Bridge
Maps MetaHumanDNA personality to real-time facial/body expression.
Package: packages/somatic-bridge/
Key files: bridge.ts, emotion-mapper.ts, expression-weights.ts
PersonalityParams -> expression bias weights -> Audio2Face blend shapes
Latency budget: <50ms round-trip (LLM <30ms + inference <15ms + UE5 <1ms + Pixel Streaming <1ms)

### Tier 3: Continuous Loop
Gives MetaHumans autonomous behavior via sense-think-act cycle.
Package: packages/continuous-loop/
Key files: loop.ts, emotion-state.ts, memory-bridge.ts, behavior-planner.ts
Emotion states: neutral, happy, concerned, curious, thinking, excited, empathetic, surprised, listening
Each state modulates: expression bias weights, gesture frequency, voice prosody, idle behavior

## Integration Flow
User -> Dispatch -> Genesis (creates DNA) -> Continuous Loop (autonomy) -> Somatic Bridge (render)
Somatic -> UE5 Headless -> Pixel Streaming -> NEXUS Browser UI
Loop -> SCRIBE (episodic memory) -> Loop (contextual recall)

## Implementation Phases
Phase 1 (Current): Somatic Bridge MVP - wire Audio2Face Docker to UE5
Phase 2: Genesis Compiler - MetaHumanDNA schema, LLM intent parser, TTS voice profiles
Phase 3: Continuous Loop - sense-think-act, emotion state machine, SCRIBE memory bridge
Phase 4: Integration - end-to-end text->MetaHuman, multi-character, live mode, recording mode

## Dependencies: packages/somatic, packages/memory, packages/dispatch, packages/engine, packages/director