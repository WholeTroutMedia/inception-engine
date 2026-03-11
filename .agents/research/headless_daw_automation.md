# RESEARCH: Headless DAW Automation for IE Audio Engine

Task: T20260307-413 | Priority: P2 | Agent: comet-browser
Date: 2026-03-07

## Executive Summary

For procedural, headless audio generation in IECR, REAPER with ReaScript (Python) is the clear winner over Ableton Max4Live CLI. REAPER runs fully headless, exposes a complete Python API, costs $60 (discounted license), and can be automated end-to-end without a display server.

## Option Comparison

### REAPER + ReaScript (Python) — RECOMMENDED

- **Headless**: Yes. REAPER can run with `-noprompt` flag, no GUI required
- **Scripting**: Full Python API via ReaScript. Also supports Lua and EEL2
- **Capabilities**: Track creation, plugin loading (VST3/LV2), MIDI sequencing, mixing, rendering — all scriptable
- **JSFX**: Real-time audio/MIDI effect scripting in EEL2 language
- **CLI rendering**: `reaper -renderproject project.rpp` for batch renders
- **Plugin hosting**: VST3, LV2, AU, JSFX — headless compatible
- **Cost**: $60 discounted / $225 commercial
- **Platform**: Windows, macOS, Linux (runs on NAS)
- **Integration**: OSC support built-in for external control

### Ableton Live + Max4Live

- **Headless**: No. Requires GUI/display. No CLI render mode
- **Scripting**: Max/MSP visual patching or JavaScript in Max. No native Python
- **Remote Control**: Live OSC remote scripts exist but require running GUI
- **Cost**: $449+ (Suite required for Max4Live)
- **Limitation**: Cannot run on headless NAS server

### Tracktion Engine (C++ SDK)

- **Headless**: Yes. Pure C++ audio engine, no GUI dependency
- **Scripting**: C++ only (no Python). Requires compiled plugins
- **Capabilities**: Full DAW engine: tracks, plugins, MIDI, audio, rendering
- **Cost**: Open source (GPL) or commercial license
- **Trade-off**: Most powerful but highest development effort

### dawscript (Abstraction Layer)

- **What**: Open-source Python abstraction over REAPER, Ableton, and Bitwig APIs
- **Capabilities**: Track volume/pan/mute, plugin bypass/params, MIDI input, network bridge
- **Useful for**: Cross-DAW compatibility if we ever need to support multiple DAWs
- **Source**: github.com/lucianoiam/dawscript

## Recommendation for IE Omnimedia Pipeline

### Architecture:
```
IE Somatic Bridge (Node.js/OSC)
    |
    +-- OSC UDP --> REAPER (headless, -noprompt)
    |                |
    |                +-- ReaScript (Python): compose, arrange, mix
    |                +-- JSFX: real-time audio effects
    |                +-- VST3: third-party instruments/effects
    |                +-- Render --> WAV/MP3/FLAC output
    |
    +-- Audio output --> Pixel Streaming or file delivery
```

### Key Integration Points:
1. REAPER OSC interface for real-time parameter control from IE agents
2. ReaScript Python for batch composition (generate MIDI, load instruments, render)
3. JSFX for custom real-time audio processing
4. CLI rendering for background/batch audio production
5. Output feeds into somatic bridge for synchronized A/V delivery

### Constraints:
1. REAPER license needed per NAS instance ($60)
2. VST3 plugins may have their own licensing requirements
3. Linux audio stack (ALSA/PulseAudio/JACK) needed on NAS for real-time monitoring
4. For pure headless rendering, no audio driver needed (offline render)

## What Won't Work:
- Ableton for headless server deployment (requires display)
- Max4Live without Ableton Suite license ($449+)
- Native Python-only audio synthesis (too slow for production quality)

## Sources
- REAPER ReaScript documentation (reaper.fm/sdk/reascript)
- dawscript abstraction layer (github.com/lucianoiam/dawscript)
- Community comparisons of DAW scripting capabilities
- REAPER CLI rendering documentation