"""Rate limiting (P59) — slowapi limiter for invite + auth-sensitive endpoints.

Defense-in-depth, not traffic shaping: invite tokens are 192-bit (brute force is
infeasible); this bounds bulk authenticated probing / abuse. Limits are deliberately
generous so legitimate users never see them.

Keying: the first hop of X-Forwarded-For (Railway's edge always sets it; uvicorn runs
without --proxy-headers, so request.client.host would be the edge IP and every client
would share ONE bucket). Falls back to the socket address off-platform. Spoofable only
by direct-to-origin traffic, which is acceptable for defense-in-depth.

Disabled via GASTIFY_RATE_LIMIT_ENABLED=false (the test suites set this — they hammer
endpoints far faster than any human).
"""

from fastapi import Request
from slowapi import Limiter

from app.config import settings

# Generous per-IP windows (documented here, asserted in tests):
INVITE_PREVIEW_LIMIT = "30/minute"
INVITE_JOIN_LIMIT = "10/minute"


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(
    key_func=_client_key,
    enabled=settings.rate_limit_enabled,
    storage_uri="memory://",
    headers_enabled=True,  # X-RateLimit-* + Retry-After on 429
)
