"""Metrics exporter endpoint — JSON (default) + Prometheus text format."""

import os
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select

from app.db import async_session
from app.models.scan import Scan, ScanStatus
from app.observability import PROMETHEUS_CONTENT_TYPE, metrics

router = APIRouter(tags=["observability"])


async def _verify_metrics_key(x_metrics_key: str | None = Header(default=None)) -> None:
    key = os.environ.get("METRICS_API_KEY")
    if key is None:
        return
    if x_metrics_key != key:
        raise HTTPException(status_code=403, detail="Invalid metrics key")


async def _refresh_queue_depth_gauge() -> None:
    """Set scans_queued_depth to the live QUEUED-scan count (P16 Phase 3 observability).

    scans is NOT RLS-bound, so this cross-scope count is correct under the metrics-key
    auth (no user scope). Best-effort: a DB hiccup must not break metrics scraping.
    """
    try:
        async with async_session() as db:
            queued = await db.scalar(
                select(func.count()).select_from(Scan).where(Scan.status == ScanStatus.QUEUED)
            )
        metrics.set_gauge("scans_queued_depth", int(queued or 0))
    except Exception:  # noqa: BLE001 - metrics scraping is best-effort
        pass


@router.get("/metrics", dependencies=[Depends(_verify_metrics_key)])
async def get_metrics(request: Request) -> Any:
    await _refresh_queue_depth_gauge()
    accept = request.headers.get("accept", "")
    if "text/plain" in accept:
        return PlainTextResponse(
            content=metrics.prometheus_text(),
            media_type=PROMETHEUS_CONTENT_TYPE,
        )
    return metrics.snapshot()
