"""Metrics exporter endpoint — JSON (default) + Prometheus text format."""

from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

from app.observability import PROMETHEUS_CONTENT_TYPE, metrics

router = APIRouter(tags=["observability"])


@router.get("/metrics")
async def get_metrics(request: Request) -> Any:
    accept = request.headers.get("accept", "")
    if "text/plain" in accept:
        return PlainTextResponse(
            content=metrics.prometheus_text(),
            media_type=PROMETHEUS_CONTENT_TYPE,
        )
    return metrics.snapshot()
