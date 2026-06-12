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

from collections.abc import Callable

from fastapi import Request
from slowapi import Limiter

from app.config import settings

# Generous per-IP windows (documented here, asserted in tests):
INVITE_PREVIEW_LIMIT = "30/minute"
INVITE_JOIN_LIMIT = "10/minute"

# Interim statement-upload cap (RATE-LIMIT-PLAN ★2): statements call REAL Gemini in
# prod and are not yet tier-gated — this closes the open spend until the D96/P87
# monthly quota system (free: none, premium: 3/month) supersedes it.
STATEMENT_UPLOAD_DAILY_LIMIT = "5/day"


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def user_or_ip_key(request: Request) -> str:
    """Key on the AUTHENTICATED user when available (stashed on request.state by
    get_auth_context), falling back to the client IP for unauthenticated paths.
    Authed abuse limits must follow the account, not the address — one user behind
    rotating IPs shares one bucket; many users behind one NAT don't."""
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return _client_key(request)


def per_resource_key(param: str) -> "Callable[[Request], str]":
    """A key_func factory for PER-RESOURCE windows (e.g. edits per TRANSACTION):
    the bucket is (user, path-param value), so hammering one resource throttles
    without touching the caller's budget on other resources."""

    def _key(request: Request) -> str:
        return f"{user_or_ip_key(request)}:{request.path_params.get(param, '')}"

    return _key


limiter = Limiter(
    key_func=_client_key,
    enabled=settings.rate_limit_enabled,
    storage_uri="memory://",
    headers_enabled=True,  # X-RateLimit-* + Retry-After on 429
)
