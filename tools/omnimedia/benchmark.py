#!/usr/bin/env python3
"""
T20260308-804 — Audio2Face NIM → SomaticBridge End-to-End Latency Benchmark

Measures P50/P95/P99 latency at each hop:
  [synthetic audio] → a2f_osc_bridge → SomaticBridge HTTP → OSC UDP sink

Usage:
    python benchmark.py [--iterations 100] [--a2f-host 127.0.0.1] [--a2f-port 8011]
                        [--somatic-host 127.0.0.1] [--somatic-port 6060]
                        [--output benchmark-results.json]
"""

import argparse
import json
import socket
import statistics
import struct
import time
import wave
from io import BytesIO
from pathlib import Path
from typing import NamedTuple

import requests

# ---------------------------------------------------------------------------
# ARKit blendshape constants
# ---------------------------------------------------------------------------
ARKIT_52 = [
    "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft",
    "browOuterUpRight", "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
    "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen",
    "jawRight", "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
    "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft",
    "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft",
    "mouthPressRight", "mouthPucker", "mouthRight", "mouthRollLower",
    "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft",
    "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
    "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight",
    "tongueOut",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class HopResult(NamedTuple):
    hop: str
    latency_ms: float
    success: bool
    error: str = ""


def make_synthetic_wav(duration_s: float = 0.5, sample_rate: int = 22050) -> bytes:
    """Generate a minimal WAV buffer (silence) for A2F payload."""
    num_samples = int(duration_s * sample_rate)
    buf = BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f"<{num_samples}h", *([0] * num_samples)))
    return buf.getvalue()


def synthetic_blendshapes() -> dict:
    """Return a synthetic ARKit blendshape dict (all 0.0 — safe no-op)."""
    return {name: 0.0 for name in ARKIT_52}


def percentile(data: list[float], pct: float) -> float:
    if not data:
        return 0.0
    sorted_data = sorted(data)
    idx = int(len(sorted_data) * pct / 100)
    idx = min(idx, len(sorted_data) - 1)
    return sorted_data[idx]


def print_table(results: dict[str, list[float]]) -> None:
    print("\n" + "=" * 60)
    print(f"{'Hop':<30} {'P50':>8} {'P95':>8} {'P99':>8}  {'N':>5}")
    print("-" * 60)
    for hop, latencies in results.items():
        if not latencies:
            print(f"{hop:<30} {'N/A':>8} {'N/A':>8} {'N/A':>8}  {'0':>5}")
            continue
        p50 = percentile(latencies, 50)
        p95 = percentile(latencies, 95)
        p99 = percentile(latencies, 99)
        n = len(latencies)
        print(f"{hop:<30} {p50:>7.1f}ms {p95:>7.1f}ms {p99:>7.1f}ms  {n:>5}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Benchmark hops
# ---------------------------------------------------------------------------

def benchmark_a2f_nim(host: str, port: int, wav_bytes: bytes) -> HopResult:
    """POST synthetic WAV to A2F NIM REST, measure response latency."""
    url = f"http://{host}:{port}/v1/audio2face/infer"
    t0 = time.perf_counter()
    try:
        resp = requests.post(
            url,
            files={"audio": ("test.wav", wav_bytes, "audio/wav")},
            data={"model": "james"},
            timeout=5.0,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        if resp.status_code == 200:
            return HopResult("A2F NIM infer", elapsed_ms, True)
        return HopResult("A2F NIM infer", elapsed_ms, False,
                         f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return HopResult("A2F NIM infer", elapsed_ms, False, str(e))


def benchmark_somatic_ingest(host: str, port: int,
                              blendshapes: dict) -> HopResult:
    """POST blendshape payload to SomaticBridge /ingest, measure latency."""
    url = f"http://{host}:{port}/ingest"
    payload = {
        "timestamp": time.time(),
        "blendshapes": blendshapes,
        "fps": 60,
    }
    t0 = time.perf_counter()
    try:
        resp = requests.post(url, json=payload, timeout=2.0)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        if resp.status_code in (200, 201, 204):
            return HopResult("SomaticBridge /ingest", elapsed_ms, True)
        return HopResult("SomaticBridge /ingest", elapsed_ms, False,
                         f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return HopResult("SomaticBridge /ingest", elapsed_ms, False, str(e))


def benchmark_osc_udp(host: str, port: int) -> HopResult:
    """
    Send a minimal OSC bundle to UE5 UDP sink and measure roundtrip.
    Since UDP is one-way, we measure the send() syscall latency only.
    Real e2e requires UE5 to echo back — this is a send-side floor measurement.
    """
    # Minimal OSC message: /somatic/arkit/jawOpen ,f 0.0
    def osc_string(s: str) -> bytes:
        b = s.encode("ascii") + b"\x00"
        pad = (4 - len(b) % 4) % 4
        return b + b"\x00" * pad

    addr = osc_string("/somatic/arkit/jawOpen")
    type_tag = osc_string(",f")
    value = struct.pack(">f", 0.0)
    osc_msg = addr + type_tag + value

    t0 = time.perf_counter()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(0.1)
        sock.sendto(osc_msg, (host, port))
        sock.close()
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return HopResult("OSC UDP send (floor)", elapsed_ms, True)
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return HopResult("OSC UDP send (floor)", elapsed_ms, False, str(e))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Omnimedia latency benchmark")
    parser.add_argument("--iterations", type=int, default=100)
    parser.add_argument("--a2f-host", default="127.0.0.1")
    parser.add_argument("--a2f-port", type=int, default=8011)
    parser.add_argument("--somatic-host", default="127.0.0.1")
    parser.add_argument("--somatic-port", type=int, default=6060)
    parser.add_argument("--osc-host", default="127.0.0.1")
    parser.add_argument("--osc-port", type=int, default=5005)
    parser.add_argument("--output", default="tools/omnimedia/benchmark-results.json")
    args = parser.parse_args()

    print(f"Omnimedia Latency Benchmark — {args.iterations} iterations")
    print(f"  A2F NIM:       {args.a2f_host}:{args.a2f_port}")
    print(f"  SomaticBridge: {args.somatic_host}:{args.somatic_port}")
    print(f"  OSC UDP sink:  {args.osc_host}:{args.osc_port}")
    print()

    wav_bytes = make_synthetic_wav()
    blendshapes = synthetic_blendshapes()

    hop_latencies: dict[str, list[float]] = {
        "A2F NIM infer": [],
        "SomaticBridge /ingest": [],
        "OSC UDP send (floor)": [],
        "Full pipeline (sum)": [],
    }
    errors: list[str] = []

    for i in range(args.iterations):
        t_pipeline_start = time.perf_counter()

        r_a2f = benchmark_a2f_nim(args.a2f_host, args.a2f_port, wav_bytes)
        if r_a2f.success:
            hop_latencies["A2F NIM infer"].append(r_a2f.latency_ms)
        else:
            errors.append(f"[{i}] A2F: {r_a2f.error}")

        r_somatic = benchmark_somatic_ingest(
            args.somatic_host, args.somatic_port, blendshapes
        )
        if r_somatic.success:
            hop_latencies["SomaticBridge /ingest"].append(r_somatic.latency_ms)
        else:
            errors.append(f"[{i}] Somatic: {r_somatic.error}")

        r_osc = benchmark_osc_udp(args.osc_host, args.osc_port)
        if r_osc.success:
            hop_latencies["OSC UDP send (floor)"].append(r_osc.latency_ms)
        else:
            errors.append(f"[{i}] OSC: {r_osc.error}")

        pipeline_ms = (time.perf_counter() - t_pipeline_start) * 1000
        hop_latencies["Full pipeline (sum)"].append(pipeline_ms)

        if (i + 1) % 10 == 0:
            print(f"  Progress: {i + 1}/{args.iterations}", end="\r", flush=True)

    print_table(hop_latencies)

    # Budget assertion
    pipeline_p95 = percentile(hop_latencies["Full pipeline (sum)"], 95)
    budget_ok = pipeline_p95 < 200.0
    budget_symbol = "✅" if budget_ok else "❌"
    print(f"\nLatency Budget: {budget_symbol}  P95 full pipeline = {pipeline_p95:.1f}ms (target: <200ms)")

    if errors:
        print(f"\n⚠️  {len(errors)} errors (showing first 5):")
        for e in errors[:5]:
            print(f"   {e}")

    # Save JSON
    summary = {}
    for hop, latencies in hop_latencies.items():
        if latencies:
            summary[hop] = {
                "n": len(latencies),
                "p50_ms": round(percentile(latencies, 50), 2),
                "p95_ms": round(percentile(latencies, 95), 2),
                "p99_ms": round(percentile(latencies, 99), 2),
                "mean_ms": round(statistics.mean(latencies), 2),
                "min_ms": round(min(latencies), 2),
                "max_ms": round(max(latencies), 2),
            }
        else:
            summary[hop] = {"n": 0, "error": "all_failed"}

    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "config": {
            "iterations": args.iterations,
            "a2f_host": args.a2f_host,
            "a2f_port": args.a2f_port,
            "somatic_host": args.somatic_host,
            "somatic_port": args.somatic_port,
        },
        "results": summary,
        "budget_passed": budget_ok,
        "errors_count": len(errors),
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\nResults saved → {out_path}")


if __name__ == "__main__":
    main()
