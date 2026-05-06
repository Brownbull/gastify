"""Metrics exporter endpoint — baseline for P1, upgraded in P5."""

from typing import Any

from fastapi import APIRouter

from app.observability import metrics

router = APIRouter(tags=["observability"])


@router.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    return metrics.snapshot()
