#!/usr/bin/env python3
"""Zero-Gemini async load test harness for Gastify staging-e2e.

Validates the D62 capacity estimate by ramping concurrent scan + poll jobs
against staging-e2e (scan_provider=fixture, statement_provider=fixture,
e2e_scan_event_delay_ms for simulated latency — $0, no LLM calls).

Measures: p50/p95/p99 latency, throughput (req/s), error rate, and surfaces
DB pool-wait pressure via health/ready endpoint monitoring.

Usage:
    # Set required env vars (or export them):
    export LOADTEST_BASE_URL="https://gastify-api-staging-e2e-staging-e2e.up.railway.app"
    export LOADTEST_FIREBASE_TOKEN="<firebase-id-token>"

    # Run all concurrency levels (1, 5, 15):
    python scripts/loadtest/harness.py

    # Run a single concurrency level:
    python scripts/loadtest/harness.py --concurrency 5

    # Generate a Firebase token first:
    python scripts/loadtest/harness.py --auth-only
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import os
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

SCAN_TERMINAL = {"completed", "failed", "needs_review"}
CONCURRENCY_LEVELS = [1, 5, 15]
SCAN_POLL_INTERVAL_S = 0.5
JOBS_PER_WORKER = 3
HEALTH_POLL_INTERVAL_S = 1.0
MAX_POLL_ATTEMPTS = 120


@dataclass
class RequestSample:
    endpoint: str
    method: str
    status_code: int
    latency_ms: float
    error: str | None = None
    body: dict[str, Any] | None = None


@dataclass
class LevelResult:
    concurrency: int
    scan_samples: list[RequestSample] = field(default_factory=list)
    poll_samples: list[RequestSample] = field(default_factory=list)
    health_samples: list[RequestSample] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    wall_clock_s: float = 0.0

    def all_samples(self) -> list[RequestSample]:
        return self.scan_samples + self.poll_samples + self.health_samples


def percentile(values: list[float], pct: int) -> float:
    if not values:
        return 0.0
    sorted_v = sorted(values)
    idx = int(len(sorted_v) * pct / 100)
    return sorted_v[min(idx, len(sorted_v) - 1)]


def _latency_stats(latencies: list[float]) -> dict[str, Any]:
    if not latencies:
        return {"count": 0}
    return {
        "count": len(latencies),
        "mean_ms": round(statistics.mean(latencies), 1),
        "p50_ms": round(percentile(latencies, 50), 1),
        "p95_ms": round(percentile(latencies, 95), 1),
        "p99_ms": round(percentile(latencies, 99), 1),
        "max_ms": round(max(latencies), 1),
    }


def summarize(result: LevelResult) -> dict[str, Any]:
    all_latencies = [s.latency_ms for s in result.all_samples()]
    poll_latencies = [s.latency_ms for s in result.poll_samples]
    scan_latencies = [s.latency_ms for s in result.scan_samples]
    health_latencies = [s.latency_ms for s in result.health_samples]
    total_requests = len(result.all_samples())
    error_count = sum(1 for s in result.all_samples() if s.error is not None)

    return {
        "concurrency": result.concurrency,
        "wall_clock_s": round(result.wall_clock_s, 2),
        "total_requests": total_requests,
        "throughput_rps": round(total_requests / max(result.wall_clock_s, 0.001), 2),
        "error_count": error_count,
        "error_rate_pct": round(error_count / max(total_requests, 1) * 100, 2),
        "all": _latency_stats(all_latencies),
        "scan_submit": _latency_stats(scan_latencies),
        "status_poll": _latency_stats(poll_latencies),
        "health_ready": _latency_stats(health_latencies),
        "errors": result.errors[:20],
    }


async def _request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    **kwargs: Any,
) -> RequestSample:
    """Execute a timed HTTP request, returning the sample with parsed body."""
    start = time.monotonic()
    error = None
    status_code = 0
    body = None
    try:
        resp = await client.request(method, url, **kwargs)
        status_code = resp.status_code
        if resp.headers.get("content-type", "").startswith("application/json"):
            with contextlib.suppress(ValueError, UnicodeDecodeError):
                body = resp.json()
        if status_code >= 400:
            error = f"HTTP {status_code}: {resp.text[:200]}"
    except httpx.HTTPError as exc:
        error = f"{type(exc).__name__}: {exc}"
    latency_ms = (time.monotonic() - start) * 1000
    endpoint = url.split("/api/v1")[-1] if "/api/v1" in url else url
    return RequestSample(
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        latency_ms=latency_ms,
        error=error,
        body=body,
    )


async def _submit_scan(
    client: httpx.AsyncClient,
    base_url: str,
    headers: dict[str, str],
    image_bytes: bytes,
    result: LevelResult,
) -> str | None:
    """Submit a scan and return its ID, recording the latency sample."""
    sample = await _request(
        client,
        "POST",
        f"{base_url}/api/v1/scans",
        headers=headers,
        files={"file": ("receipt.jpg", image_bytes, "image/jpeg")},
    )
    result.scan_samples.append(sample)
    if sample.error:
        result.errors.append(f"scan submit: {sample.error}")
        return None
    return sample.body.get("id") if sample.body else None


async def _poll_scan_until_terminal(
    client: httpx.AsyncClient,
    base_url: str,
    headers: dict[str, str],
    scan_id: str,
    result: LevelResult,
) -> str | None:
    """Poll GET /scans/{id} until terminal status. Returns final status."""
    url = f"{base_url}/api/v1/scans/{scan_id}"
    for _ in range(MAX_POLL_ATTEMPTS):
        sample = await _request(client, "GET", url, headers=headers)
        result.poll_samples.append(sample)
        if sample.error:
            result.errors.append(f"scan poll {scan_id[:8]}: {sample.error}")
            return None
        status = (sample.body or {}).get("status", "")
        if status in SCAN_TERMINAL:
            return status
        await asyncio.sleep(SCAN_POLL_INTERVAL_S)
    result.errors.append(f"scan {scan_id[:8]}: timeout after {MAX_POLL_ATTEMPTS} polls")
    return None


async def _scan_lifecycle_worker(
    client: httpx.AsyncClient,
    base_url: str,
    headers: dict[str, str],
    image_bytes: bytes,
    result: LevelResult,
    n_jobs: int,
) -> None:
    """Run n_jobs sequential scan submit → poll cycles."""
    for _ in range(n_jobs):
        scan_id = await _submit_scan(client, base_url, headers, image_bytes, result)
        if scan_id:
            await _poll_scan_until_terminal(client, base_url, headers, scan_id, result)


async def _health_monitor(
    client: httpx.AsyncClient,
    base_url: str,
    result: LevelResult,
    stop: asyncio.Event,
) -> None:
    """Continuously poll /health/ready until stop is set."""
    url = f"{base_url}/api/v1/health/ready"
    while not stop.is_set():
        sample = await _request(client, "GET", url)
        result.health_samples.append(sample)
        if sample.error:
            result.errors.append(f"health: {sample.error}")
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(stop.wait(), timeout=HEALTH_POLL_INTERVAL_S)


async def run_level(
    base_url: str,
    token: str,
    image_bytes: bytes,
    concurrency: int,
    jobs_per_worker: int,
) -> LevelResult:
    result = LevelResult(concurrency=concurrency)
    stop_health = asyncio.Event()
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        start = time.monotonic()
        health_task = asyncio.create_task(
            _health_monitor(client, base_url, result, stop_health)
        )
        workers = [
            _scan_lifecycle_worker(
                client, base_url, headers, image_bytes, result, jobs_per_worker
            )
            for _ in range(concurrency)
        ]
        await asyncio.gather(*workers)
        stop_health.set()
        await health_task
        result.wall_clock_s = time.monotonic() - start

    return result


def print_summary(summary: dict[str, Any]) -> None:
    print(f"\n{'='*60}")
    print(f"  Concurrency Level: {summary['concurrency']}")
    print(f"{'='*60}")
    print(f"  Wall clock:   {summary['wall_clock_s']}s")
    print(f"  Total reqs:   {summary['total_requests']}")
    print(f"  Throughput:   {summary['throughput_rps']} req/s")
    print(f"  Error rate:   {summary['error_rate_pct']}%  ({summary['error_count']} errors)")
    for section in ("scan_submit", "status_poll", "health_ready", "all"):
        stats = summary[section]
        if stats.get("count", 0) == 0:
            continue
        label = section.replace("_", " ").title()
        print(f"\n  {label} ({stats['count']} reqs):")
        print(
            f"    mean={stats['mean_ms']}ms  p50={stats['p50_ms']}ms  "
            f"p95={stats['p95_ms']}ms  p99={stats['p99_ms']}ms  max={stats['max_ms']}ms"
        )
    if summary["errors"]:
        print(f"\n  Errors (first {len(summary['errors'])}):")
        for e in summary["errors"]:
            print(f"    - {e[:120]}")
    print()


async def get_firebase_token(
    project_id: str,
    credentials_path: str,
    email: str,
) -> str:
    """Create a custom token via Admin SDK, exchange for an ID token via REST."""
    import firebase_admin
    from firebase_admin import auth
    from firebase_admin import credentials as fb_credentials

    if not firebase_admin._apps:
        cred = fb_credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred, {"projectId": project_id})

    user = auth.get_user_by_email(email)
    custom_token = auth.create_custom_token(user.uid)

    api_key = os.environ.get("FIREBASE_WEB_API_KEY", "")
    if not api_key:
        raise ValueError(
            "FIREBASE_WEB_API_KEY required to exchange custom token for ID token. "
            "Find it in Firebase Console → Project Settings → Web API Key."
        )

    token_str = custom_token if isinstance(custom_token, str) else custom_token.decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken",
            params={"key": api_key},
            json={"token": token_str, "returnSecureToken": True},
            headers={"Referer": "http://localhost"},
        )
        if resp.status_code != 200:
            raise ValueError(f"Token exchange failed: {resp.text}")
        return resp.json()["idToken"]


async def verify_connectivity(base_url: str, token: str) -> bool:
    """Quick health + auth check before running the full load test."""
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        health = await client.get(f"{base_url}/api/v1/health")
        if health.status_code != 200:
            print(f"Health check failed: {health.status_code} {health.text}")
            return False
        print(f"Health: {health.json()}")

        ready = await client.get(f"{base_url}/api/v1/health/ready")
        print(f"Ready:  {ready.json()}")

        auth_check = await client.get(
            f"{base_url}/api/v1/transactions",
            headers={"Authorization": f"Bearer {token}"},
        )
        if auth_check.status_code == 401:
            print("Auth failed: token rejected (401). Get a fresh token.")
            return False
        if auth_check.status_code >= 400:
            print(f"Auth probe returned {auth_check.status_code}: {auth_check.text[:200]}")
            return False
        print(f"Auth:   OK (transactions returned {auth_check.status_code})")
    return True


def _load_test_image() -> bytes:
    """Load the smallest e2e fixture image for scan submissions."""
    fixture_dir = Path(__file__).resolve().parents[2] / "tests/mobile/fixtures/receipts"
    candidates = list(fixture_dir.glob("*.jpg"))
    if not candidates:
        raise FileNotFoundError(f"No fixture images in {fixture_dir}")
    smallest = min(candidates, key=lambda p: p.stat().st_size)
    print(f"Using fixture image: {smallest.name} ({smallest.stat().st_size} bytes)")
    return smallest.read_bytes()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gastify zero-Gemini load test")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("LOADTEST_BASE_URL", ""),
        help="Staging-e2e API base URL",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("LOADTEST_FIREBASE_TOKEN", ""),
        help="Firebase ID token for auth",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=0,
        help="Run a single concurrency level (default: all three)",
    )
    parser.add_argument(
        "--jobs-per-worker",
        type=int,
        default=JOBS_PER_WORKER,
        help=f"Scan lifecycle jobs per concurrent worker (default: {JOBS_PER_WORKER})",
    )
    parser.add_argument(
        "--auth-only",
        action="store_true",
        help="Only generate a Firebase token, then exit",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Write JSON results to this file",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()

    if args.auth_only:
        project_id = os.environ.get("GASTIFY_FIREBASE_PROJECT_ID", "")
        creds_path = os.environ.get("GASTIFY_FIREBASE_CREDENTIALS_PATH", "")
        email = os.environ.get("GASTIFY_MOBILE_E2E_EMAIL", "")
        if not all([project_id, creds_path, email]):
            print("Required env vars for --auth-only:")
            print("  GASTIFY_FIREBASE_PROJECT_ID")
            print("  GASTIFY_FIREBASE_CREDENTIALS_PATH")
            print("  GASTIFY_MOBILE_E2E_EMAIL")
            print("  FIREBASE_WEB_API_KEY")
            return 1
        token = await get_firebase_token(project_id, creds_path, email)
        print(f"\nFirebase ID token:\n{token}")
        return 0

    base_url = args.base_url.rstrip("/")
    token = args.token
    if not base_url or not token:
        print("Required: --base-url and --token (or LOADTEST_BASE_URL / LOADTEST_FIREBASE_TOKEN)")
        return 1

    print(f"Target: {base_url}")
    print("Verifying connectivity...")
    if not await verify_connectivity(base_url, token):
        return 1

    image_bytes = _load_test_image()
    jobs_per_worker = args.jobs_per_worker
    levels = [args.concurrency] if args.concurrency > 0 else CONCURRENCY_LEVELS
    all_summaries: list[dict[str, Any]] = []

    for level in levels:
        total_scans = level * jobs_per_worker
        print(
            f"\n--- Running concurrency={level} "
            f"({jobs_per_worker} jobs/worker, {total_scans} total scans) ---"
        )
        result = await run_level(base_url, token, image_bytes, level, jobs_per_worker)
        summary = summarize(result)
        all_summaries.append(summary)
        print_summary(summary)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(all_summaries, indent=2))
        print(f"Results written to {out_path}")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
