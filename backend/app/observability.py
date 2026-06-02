"""Metrics registry — in-memory counters + histograms with Prometheus export.

P1 baseline: simple counters + histograms in JSON format.
P5: OTel/Prometheus-compatible text exposition + per-scan metric families.
"""

import random
import time
from collections import defaultdict
from threading import Lock
from typing import Any

_MAX_RESERVOIR = 1024

METRIC_HELP: dict[str, str] = {
    "http_requests_total": "Total HTTP requests processed.",
    "http_requests_2xx": "HTTP requests with 2xx status.",
    "http_requests_3xx": "HTTP requests with 3xx status.",
    "http_requests_4xx": "HTTP requests with 4xx status.",
    "http_requests_5xx": "HTTP requests with 5xx status.",
    "http_request_duration_ms": "HTTP request duration in milliseconds.",
    "scans_total": "Total receipt scans initiated.",
    "scans_success": "Receipt scans completed successfully.",
    "scans_failed": "Receipt scans that failed.",
    "scan_duration_ms": "End-to-end scan duration in milliseconds.",
    "llm_latency_ms": "LLM inference latency in milliseconds.",
    "llm_tokens_in": "LLM input tokens per scan.",
    "llm_tokens_out": "LLM output tokens per scan.",
    "llm_cost_usd": "LLM cost per scan in USD.",
    "queue_wait_ms": "Queue wait time before scan processing in milliseconds.",
    "thumbnail_gen_ms": "Thumbnail generation time in milliseconds.",
    "concurrent_active_scans": "Current number of scans being processed (D62 Path-B trigger).",
    "concurrent_active_scans_peak": (
        "Peak concurrent active scans since process start (D62 Path-B trigger)."
    ),
    "db_pool_checkout_wait_ms": (
        "DB connection pool checkout wait time in ms (D62 Path-B trigger)."
    ),
    "scan_error_rate_limit": "Scans that hit Gemini 429 rate limit (D62 Path-B trigger).",
    "scan_error_quota_exceeded": "Scans throttled by Gemini quota (D62 Path-B trigger).",
}

PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._counters: dict[str, int] = defaultdict(int)
        self._gauges: dict[str, float] = defaultdict(float)
        self._reservoirs: dict[str, list[float]] = defaultdict(list)
        self._hist_counts: dict[str, int] = defaultdict(int)
        self._hist_sums: dict[str, float] = defaultdict(float)
        self._hist_mins: dict[str, float] = {}
        self._hist_maxs: dict[str, float] = {}
        self._start_time = time.time()

    def inc(self, name: str, value: int = 1) -> None:
        with self._lock:
            self._counters[name] += value

    def set_gauge(self, name: str, value: float) -> None:
        with self._lock:
            self._gauges[name] = value

    def track_max(self, name: str, value: float) -> None:
        with self._lock:
            if value > self._gauges.get(name, 0):
                self._gauges[name] = value

    def observe(self, name: str, value: float) -> None:
        with self._lock:
            self._hist_counts[name] += 1
            self._hist_sums[name] += value
            if name not in self._hist_mins or value < self._hist_mins[name]:
                self._hist_mins[name] = value
            if name not in self._hist_maxs or value > self._hist_maxs[name]:
                self._hist_maxs[name] = value

            reservoir = self._reservoirs[name]
            n = self._hist_counts[name]
            if len(reservoir) < _MAX_RESERVOIR:
                reservoir.append(value)
            else:
                j = random.randint(0, n - 1)
                if j < _MAX_RESERVOIR:
                    reservoir[j] = value

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return self._snapshot_unlocked()

    def prometheus_text(self) -> str:
        with self._lock:
            return self._prometheus_unlocked()

    def _snapshot_unlocked(self) -> dict[str, Any]:
        histograms: dict[str, Any] = {}
        for name in self._hist_counts:
            count = self._hist_counts[name]
            if count == 0:
                continue
            sorted_vals = sorted(self._reservoirs[name])
            sample_len = len(sorted_vals)
            histograms[name] = {
                "count": count,
                "sum": round(self._hist_sums[name], 2),
                "min": round(self._hist_mins[name], 2),
                "max": round(self._hist_maxs[name], 2),
                "p50": round(sorted_vals[sample_len // 2], 2),
                "p95": (
                    round(sorted_vals[int(sample_len * 0.95)], 2) if sample_len >= 20 else None
                ),
                "p99": (
                    round(sorted_vals[int(sample_len * 0.99)], 2) if sample_len >= 100 else None
                ),
            }

        return {
            "uptime_seconds": round(time.time() - self._start_time, 1),
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "histograms": histograms,
        }

    def _prometheus_unlocked(self) -> str:
        lines: list[str] = []

        uptime = round(time.time() - self._start_time, 1)
        lines.append("# HELP gastify_uptime_seconds Process uptime in seconds.")
        lines.append("# TYPE gastify_uptime_seconds gauge")
        lines.append(f"gastify_uptime_seconds {uptime}")

        for name, value in sorted(self._gauges.items()):
            prom_name = f"gastify_{name}"
            help_text = METRIC_HELP.get(name, "")
            if help_text:
                lines.append(f"# HELP {prom_name} {help_text}")
            lines.append(f"# TYPE {prom_name} gauge")
            lines.append(f"{prom_name} {value}")

        for name, value in sorted(self._counters.items()):
            prom_name = f"gastify_{name}"
            help_text = METRIC_HELP.get(name, "")
            if help_text:
                lines.append(f"# HELP {prom_name} {help_text}")
            lines.append(f"# TYPE {prom_name} counter")
            lines.append(f"{prom_name} {value}")

        for name in sorted(self._hist_counts.keys()):
            count = self._hist_counts[name]
            if count == 0:
                continue
            prom_name = f"gastify_{name}"
            help_text = METRIC_HELP.get(name, "")
            if help_text:
                lines.append(f"# HELP {prom_name} {help_text}")
            lines.append(f"# TYPE {prom_name} summary")

            sorted_vals = sorted(self._reservoirs[name])
            sample_len = len(sorted_vals)
            if sample_len > 0:
                p50 = sorted_vals[sample_len // 2]
                lines.append(f'{prom_name}{{quantile="0.5"}} {p50}')
            if sample_len >= 20:
                p95 = sorted_vals[int(sample_len * 0.95)]
                lines.append(f'{prom_name}{{quantile="0.95"}} {p95}')
            if sample_len >= 100:
                p99 = sorted_vals[int(sample_len * 0.99)]
                lines.append(f'{prom_name}{{quantile="0.99"}} {p99}')

            lines.append(f"{prom_name}_sum {self._hist_sums[name]}")
            lines.append(f"{prom_name}_count {count}")

        lines.append("")
        return "\n".join(lines)


metrics = MetricsRegistry()
