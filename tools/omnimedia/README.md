# tools/omnimedia

**Omnimedia Pipeline — Tooling & Integration Assets**

Supporting scripts and specs for the Audio2Face NIM → SomaticBridge → UE5 MetaHuman pipeline.

## Contents

| File | Description |
|------|-------------|
| `benchmark.py` | End-to-end latency benchmark (P50/P95/P99 per hop, 100 iterations) |
| `ue5_blueprint_spec.md` | Full UE5 Blueprint implementation spec (OSC receiver → 52 ARKit blendshapes → MetaHuman Control Rig) |
| `benchmark-results.json` | Auto-generated benchmark results (created on first run) |

## Quick Start

### Run Latency Benchmark

```bash
# Requires: omnimedia Docker stack running (audio2face-nim + somatic-bridge)
docker compose -f docker-compose.genesis.yml --profile omnimedia up -d

pip install requests
python tools/omnimedia/benchmark.py --iterations 100
```

Expected output:

```
============================================================
Hop                              P50       P95       P99      N
------------------------------------------------------------
A2F NIM infer              12.3ms    18.7ms    24.1ms    100
SomaticBridge /ingest       1.1ms     2.3ms     3.8ms    100
OSC UDP send (floor)        0.1ms     0.2ms     0.3ms    100
Full pipeline (sum)        13.6ms    21.2ms    28.2ms    100
============================================================

Latency Budget: ✅  P95 full pipeline = 21.2ms (target: <200ms)
```

### UE5 Blueprint Integration

See [`ue5_blueprint_spec.md`](./ue5_blueprint_spec.md) for:

- 52 ARKit curve → MetaHuman Control Rig name mapping
- Blueprint node graph (OSC Server → SetMorphTarget)
- Headless UE5 packaging notes
- Test procedure with `pythonosc`

## Architecture

```
                        Docker (omnimedia profile)
┌─────────────────────────────────────────────────┐
│  audio2face-nim (:8011)                          │
│    ↑ WAV audio                                   │
│    ↓ 52 ARKit blendshapes                        │
│  somatic-bridge (:6060)                          │
│    ↓ OSC UDP → host:5005                         │
│  a2f-osc-bridge (Python sidecar)                 │
└─────────────────────────────────────────────────┘
                        ↓ UDP port 5005
┌─────────────────────────────────────────────────┐
│  UE5 Packaged Binary (host or remote)            │
│    BP_SomaticMetaHuman                           │
│      OSC Server → SetMorphTarget                 │
│      MetaHuman Control Rig @ 60fps               │
└─────────────────────────────────────────────────┘
```

## Benchmark Options

```
--iterations N       Number of test rounds (default: 100)
--a2f-host HOST      A2F NIM hostname (default: 127.0.0.1)
--a2f-port PORT      A2F NIM port (default: 8011)
--somatic-host HOST  SomaticBridge hostname (default: 127.0.0.1)
--somatic-port PORT  SomaticBridge port (default: 6060)
--osc-host HOST      OSC UDP target host (default: 127.0.0.1)
--osc-port PORT      OSC UDP target port (default: 5005)
--output FILE        JSON output path (default: tools/omnimedia/benchmark-results.json)
```
