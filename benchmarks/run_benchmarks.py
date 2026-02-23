"""
Inception Engine - Performance Benchmark Suite

Automated benchmarks for API response times, throughput,
and concurrent connection handling.

HELIX DELTA - Performance Validation

Usage:
    python benchmarks/run_benchmarks.py --url http://localhost:8000
"""

import asyncio
import time
import argparse
import json
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass, field

try:
    import aiohttp
except ImportError:
    print("Install aiohttp: pip install aiohttp")
    exit(1)


@dataclass
class BenchmarkResult:
    """Result of a single benchmark run."""
    name: str
    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    latencies_ms: List[float] = field(default_factory=list)
    duration_seconds: float = 0.0

    @property
    def p50(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.50)
        return sorted_lat[idx]

    @property
    def p95(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.95)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    @property
    def p99(self) -> float:
        if not self.latencies_ms:
            return 0.0
        sorted_lat = sorted(self.latencies_ms)
        idx = int(len(sorted_lat) * 0.99)
        return sorted_lat[min(idx, len(sorted_lat) - 1)]

    @property
    def avg(self) -> float:
        return statistics.mean(self.latencies_ms) if self.latencies_ms else 0.0

    @property
    def rps(self) -> float:
        return self.total_requests / self.duration_seconds if self.duration_seconds > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "total_requests": self.total_requests,
            "successful": self.successful,
            "failed": self.failed,
            "duration_seconds": round(self.duration_seconds, 2),
            "rps": round(self.rps, 1),
            "latency_ms": {
                "avg": round(self.avg, 2),
                "p50": round(self.p50, 2),
                "p95": round(self.p95, 2),
                "p99": round(self.p99, 2),
            },
        }


async def benchmark_endpoint(
    session: aiohttp.ClientSession,
    url: str,
    name: str,
    num_requests: int = 1000,
    concurrency: int = 50,
) -> BenchmarkResult:
    """Benchmark a single endpoint with concurrent requests."""
    result = BenchmarkResult(name=name, total_requests=num_requests)
    semaphore = asyncio.Semaphore(concurrency)

    async def make_request():
        async with semaphore:
            start = time.monotonic()
            try:
                async with session.get(url) as resp:
                    await resp.read()
                    latency = (time.monotonic() - start) * 1000
                    result.latencies_ms.append(latency)
                    if resp.status < 400:
                        result.successful += 1
                    else:
                        result.failed += 1
            except Exception:
                result.failed += 1

    overall_start = time.monotonic()
    tasks = [make_request() for _ in range(num_requests)]
    await asyncio.gather(*tasks)
    result.duration_seconds = time.monotonic() - overall_start
    return result


async def run_benchmarks(base_url: str):
    """Run the full benchmark suite."""
    print(f"\nInception Engine Performance Benchmarks")
    print(f"Target: {base_url}")
    print("=" * 60)

    endpoints = [
        ("/health", "Health Check", 2000, 100),
        ("/health/live", "Liveness Probe", 2000, 100),
        ("/health/ready", "Readiness Probe", 1000, 50),
        ("/api/v1/status", "API Status", 1000, 50),
        ("/metrics", "Prometheus Metrics", 500, 25),
    ]

    results = []
    targets = {
        "Health Check": 100,
        "Liveness Probe": 100,
        "Readiness Probe": 100,
        "API Status": 100,
        "Prometheus Metrics": 200,
    }

    async with aiohttp.ClientSession() as session:
        for path, name, num_req, concurrency in endpoints:
            url = f"{base_url}{path}"
            print(f"\nBenchmarking: {name} ({url})")
            print(f"  Requests: {num_req}, Concurrency: {concurrency}")

            result = await benchmark_endpoint(
                session, url, name, num_req, concurrency
            )
            results.append(result)

            target = targets.get(name, 100)
            passed = result.p95 < target
            status = "PASS" if passed else "FAIL"

            print(f"  Results:")
            print(f"    RPS:     {result.rps:.1f}")
            print(f"    Avg:     {result.avg:.2f}ms")
            print(f"    P50:     {result.p50:.2f}ms")
            print(f"    P95:     {result.p95:.2f}ms (target: <{target}ms) [{status}]")
            print(f"    P99:     {result.p99:.2f}ms")
            print(f"    Success: {result.successful}/{result.total_requests}")

    # Summary
    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)

    all_passed = True
    for result in results:
        target = targets.get(result.name, 100)
        passed = result.p95 < target
        if not passed:
            all_passed = False
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {result.name}: p95={result.p95:.2f}ms (target <{target}ms)")

    print(f"\nOverall: {'ALL BENCHMARKS PASSED' if all_passed else 'SOME BENCHMARKS FAILED'}")

    # Write JSON results
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "target": base_url,
        "all_passed": all_passed,
        "results": [r.to_dict() for r in results],
    }

    with open("benchmarks/results.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to benchmarks/results.json")

    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Inception Engine Benchmarks")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL")
    args = parser.parse_args()

    passed = asyncio.run(run_benchmarks(args.url))
    exit(0 if passed else 1)


if __name__ == "__main__":
    main()
