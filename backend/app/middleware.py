"""Request middleware — X-Request-Id propagation + access logging."""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.observability import metrics


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        logger = structlog.get_logger("access")
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            metrics.inc("http_requests_total")
            metrics.inc("http_requests_5xx")
            metrics.observe("http_request_duration_ms", duration_ms)
            await logger.ainfo(
                "request",
                method=request.method,
                path=request.url.path,
                status=500,
                duration_ms=duration_ms,
                client=request.client.host if request.client else None,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        metrics.inc("http_requests_total")
        metrics.inc(f"http_requests_{response.status_code // 100}xx")
        metrics.observe("http_request_duration_ms", duration_ms)

        await logger.ainfo(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
            client=request.client.host if request.client else None,
        )
        return response
