# TouchDesigner OSC Setup — OmniMedia V2

## Overview

OmniMedia V2 sends OSC (Open Sound Control) commands via UDP to a running
TouchDesigner instance to render an audio-reactive VFX overlay. This document
describes the exact network configuration required.

---

## Port Configuration

| Direction       | Protocol | Address       | Port |
|:----------------|:---------|:--------------|:-----|
| Genkit → TD     | UDP      | 127.0.0.1     | 7000 |
| TD → Genkit     | UDP      | 127.0.0.1     | 7001 |

`vfx-renderer.ts` uses ENV vars `TD_OSC_HOST`, `TD_OSC_PORT`, `TD_OSC_LISTEN_PORT` to override.

---

## OSC Address Schema

### Inbound to TD (Genkit → TouchDesigner)

```
/omnimedia/ping
    (no args) — heartbeat check, TD should reply /omnimedia/pong

/omnimedia/trigger  f:bpm  s:style  f:duration  s:format  s:outputPath  i:replyPort
    bpm         : float  — music BPM for sync (e.g., 125.0)
    style       : string — "neon-glitch" | "plasma" | "chromatic" | "dark-matter"
    duration    : float  — render duration in seconds
    format      : string — "vertical" | "landscape" | "square"
    outputPath  : string — absolute path for rendered .mp4 output
    replyPort   : int    — UDP port on localhost to send completion reply to
```

### Outbound from TD (TouchDesigner → Genkit)

```
/omnimedia/pong
    (no args) — response to /ping, confirms TD is online

/omnimedia/complete
    s:outputPath — path to the rendered .mp4 file

/omnimedia/error
    s:message — error description if render failed

/omnimedia/status  f:progress
    (optional) — 0.0 to 1.0 render progress for logging
```

---

## TouchDesigner Network Setup

### Step 1 — OSC In CHOP

1. In your `.toe` project, add an **OSC In CHOP**
2. Settings:
   - **Active**: On
   - **Protocol**: UDP
   - **Port**: `7000`
   - **Local Address**: `127.0.0.1`
3. This receives all `/omnimedia/*` messages

### Step 2 — Script CHOP (Message Parser)

Add a **Script CHOP** driven by the OSC In CHOP. In the `onCook` callback:

```python
import td

def onCook(scriptOp):
    for chan in scriptOp.inputs[0].chans():
        if '/omnimedia/trigger' in chan.name:
            # Parse OSC args from channel data
            bpm      = float(op('oscinchop1')['bpm'])
            style    = op('oscinchop1')['style'].eval()
            duration = float(op('oscinchop1')['duration'])
            output   = op('oscinchop1')['outputPath'].eval()
            format_t = op('oscinchop1')['format'].eval()
            reply_p  = int(op('oscinchop1')['replyPort'])

            # Store params in Table DAT for downstream nodes to read
            t = op('params_table')
            t['bpm', 1]       = bpm
            t['style', 1]     = style
            t['duration', 1]  = duration
            t['outputPath', 1]= output
            t['format', 1]    = format_t
            t['replyPort', 1] = reply_p

            # Trigger the render network
            op('render_trigger').par.active = True
```

### Step 3 — Render Network

1. Connect your audio-reactive visual network to a **Movie File Out TOP**
2. Set **Movie File Out TOP** output path from `op('params_table')['outputPath', 1]`
3. Set format-specific resolution:
   - `vertical` → 1080×1920
   - `landscape` → 1920×1080
   - `square` → 1080×1080
4. Set timeline length from `op('params_table')['duration', 1]` × FPS

### Step 4 — BPM Sync

1. Add a **Beat CHOP** or **Audio Spectrum CHOP** fed by a test audio file
2. Set BPM from `op('params_table')['bpm', 1]`
3. Drive your visual effects from the Beat CHOP pulses

### Step 5 — Completion Reply (OSC Out CHOP)

Add an **OSC Out CHOP** that fires when Movie File Out TOP finishes:

```python
# In Movie File Out TOP's onEndRecord callback:
import td
osc_out = op('oscout')
reply_port = int(op('params_table')['replyPort', 1])
output_path = op('params_table')['outputPath', 1]
osc_out.sendMessage('/omnimedia/complete', output_path, port=reply_port)
```

---

## Style Visual Presets

These are the styles requested by `vfx-renderer.ts`. Map them in TD:

| Style          | Suggested Effect                                         |
|:---------------|:---------------------------------------------------------|
| `neon-glitch`  | Digital glitch + chromatic aberration + neon scan lines  |
| `plasma`       | Fluid plasma simulation, UV feedback loop                |
| `chromatic`    | Iridescent prism shifting, HSV rotate, glow              |
| `dark-matter`  | Particle system, gravitational lens distortion, dark BG  |

---

## Testing the Connection

From a terminal, send a manual ping:

```bash
# Python one-liner to ping TD
python -c "
import socket, struct
addr = '/omnimedia/ping\x00\x00\x00\x00'
type_tag = ',\x00\x00\x00'
packet = addr.encode() + type_tag.encode()
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.sendto(packet, ('127.0.0.1', 7000))"
```

Or run from the `vfx-renderer.ts` test harness:

```bash
npx tsx -e "
import { VfxRendererFlow } from './src/flows/vfx-renderer.js';
VfxRendererFlow({ bpm: 125, style: 'neon-glitch', durationSeconds: 5, format: 'vertical', sessionId: 'test' })
  .then(r => console.log(r));
"
```

---

## Recommended `.toe` Project Structure

```
OmniMedia_Network.toe
├── /base_input         — OSC In CHOP, Script CHOP, params_table DAT
├── /base_render
│   ├── Beat CHOP       — BPM sync
│   ├── Noise TOP       — base generative texture
│   ├── Feedback TOP    — temporal accumulation
│   ├── Glitch TOP      — digital artifacts
│   └── Composite TOP   — final mix
└── /base_output
    ├── Movie File Out TOP  — file render
    └── OSC Out CHOP        — completion reply
```

> **Note:** The `.toe` project file itself is not code-generated — create it once  
> in TouchDesigner and save to `tools/touchdesigner/omnimedia_network.toe`.
