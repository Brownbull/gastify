"""Metrics registry — in-memory counters for baseline observability.

P1 baseline: simple counters + histograms in JSON format.
P5 upgrades to OTel/Prometheus-compatible exporter with per-scan metrics.
"""

import random
import time
from collections import defaultdict
from threading import Lock

_MAX_RESERVOIR = 1024


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._counters: dict[str, int] = defaultdict(int)
        self._reservoirs: dict[str, list[float]] = defaultdict(list)
        self._hist_counts: dict[str, int] = defaultdict(int)
        self._hist_sums: dict[str, float] = defaultdict(float)
        self._hist_mins: dict[str, float] = {}
        self._hist_maxs: dict[str, float] = {}
        self._start_time = time.time()

    def inc(self, name: str, value: int = 1) -> None:
        with self._lock:
            self._counters[name] += value

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

    def snapshot(self) -> dict:
        with self._lock:
            histograms = {}
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
                "histograms": histograms,
            }


metrics = MetricsRegistry()
