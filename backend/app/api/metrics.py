"""Metrics exporter endpoint — JSON (default) + Prometheus text format."""

import os
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import PlainTextResponse

from app.observability import PROMETHEUS_CONTENT_TYPE, metrics

router = APIRouter(tags=["observability"])


async def _verify_metrics_key(x_metrics_key: str | None = Header(default=None)) -> None:
    key = os.environ.get("METRICS_API_KEY")
    if key is None:
        return
    if x_metrics_key != key:
        raise HTTPException(status_code=403, detail="Invalid metrics key")


@router.get("/metrics", dependencies=[Depends(_verify_metrics_key)])
async def get_metrics(request: Request) -> Any:
    accept = request.headers.get("accept", "")
    if "text/plain" in accept:
        return PlainTextResponse(
            content=metrics.prometheus_text(),
            media_type=PROMETHEUS_CONTENT_TYPE,
        )
    return metrics.snapshot()
