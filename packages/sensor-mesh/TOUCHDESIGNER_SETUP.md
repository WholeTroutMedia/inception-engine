# TouchDesigner Setup Guide — ANTITRUST Instrument Router

> **Tier 4 — THE INSTRUMENT**: Body sensors drive your TouchDesigner effects.  
> InstrumentRouter (Node.js) → UDP OSC → TouchDesigner

---

## Architecture

```
[ZigSim Bridge]      → OSC/UDP :5010 → InstrumentRouter → OSC/UDP :9000 → TouchDesigner
[BiometricBridge]    → internal event │                                        ↓
[VisionNode]         → internal event │                              OSC In CHOP → CHOPs → Effects
[SpatialDirector]    → internal event ↓
```

---

## TouchDesigner Project Setup

### Step 1 — OSC In CHOP

1. Add an **OSC In CHOP** to your network
2. Set:
   - **Port**: `9000`
   - **Protocol**: UDP
   - **Active**: `On`

This will receive all routed sensor data from the InstrumentRouter.

### Step 2 — Channel Reference

The InstrumentRouter sends these channels (using default mappings):

| OSC Address | Source | Range | Suggested Effect |
|-------------|--------|-------|-----------------|
| `/td/filter_cutoff` | Jaw open | 200–8000 Hz | Filter cutoff frequency |
| `/td/reverb_wet` | Brow inner up | 0–1 | Reverb wet amount |
| `/td/camera_pan` | Gyro X | -180–180° | Camera pan control |
| `/td/strobe_intensity` | Eye blink | 0–1 | Strobe / flash intensity |
| `/td/particle_density` | BPM | 0.1–1.0 | Particle system density |
| `/td/distortion_wet` | Motion intensity | 0–0.8 | Audio/visual distortion |
| `/td/global_scale` | Room energy | 0.5–2.0 | Global scene scale |

### Step 3 — Connecting to Effects

```
OSC In CHOP [port 9000]
    └── Rename CHOP (strip /td/ prefix)
        ├── filter_cutoff → [Audio Filter CHOP] → cutoff param
        ├── reverb_wet   → [Reverb CHOP] → wet param
        ├── camera_pan   → [Camera COMP] → ry param
        ├── particle_density → [Particle SOP] → birthrate param
        └── global_scale → [Null CHOP] → global scale expressions
```

In any parameter field, reference a CHOP channel:

```
op('osc_in1')['filter_cutoff']
```

---

## Running the InstrumentRouter

```bash
# From brainchild-v5 root
npx ts-node packages/sensor-mesh/src/InstrumentRouter.ts
```

Or in your integration code:

```typescript
import { InstrumentRouter, DEFAULT_MAPPINGS } from '@inception/sensor-mesh';
import { ZigSimBridge } from '@inception/sensor-mesh';

const router = new InstrumentRouter(DEFAULT_MAPPINGS);
router.start();

const bridge = new ZigSimBridge({
  listenPort: 5010,
  targetPort: 5005,
});

// Wire ZigSim face channels to router
bridge.on('face', (channels: Record<string, number>) => {
  for (const [ch, val] of Object.entries(channels)) {
    router.route(`/zigsim/arface/${ch}`, val);
  }
});

bridge.start();
```

---

## Recording a Performance

```typescript
router.startRecording();

// ... perform for duration ...

const timeline = router.stopRecording('./my-session.osc-timeline.json');
console.log(`Recorded ${timeline.length} frames`);

// Replay later
const saved = router.loadTimeline('./my-session.osc-timeline.json');
await router.playback(saved);
```

---

## Custom Mappings

Override the defaults with a JSON config file:

```json
[
  {
    "name": "mouth-smile → fog-density",
    "sourceAddress": "/zigsim/arface/mouthSmileLeft",
    "targetAddress": "/td/fog_density",
    "targetHost": "127.0.0.1",
    "targetPort": 9000,
    "inputMin": 0,
    "inputMax": 1,
    "outputMin": 0,
    "outputMax": 1,
    "clamp": true
  }
]
```

Load it:

```typescript
const router = InstrumentRouter.fromConfig('./my-mappings.json');
```

---

## Multi-Machine Setup

TouchDesigner can run on a different machine:

1. Change `targetHost` in your mappings to the TouchDesigner machine's IP
2. Ensure UDP port `9000` is open on that machine's firewall
3. TouchDesigner's OSC In CHOP: set IP to `*` (accept from any)

---

## Latency Reference

| Stage | Latency |
|-------|---------|
| ZigSim → InstrumentRouter | ~2ms |
| Router normalization | <0.1ms |
| UDP send → TouchDesigner | ~1ms (LAN) |
| **Total face → effect** | **~3–5ms** |
