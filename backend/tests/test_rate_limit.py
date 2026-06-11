"""P59 rate limiting — invite endpoints return 429 once the per-IP window is exhausted.

The suite-wide conftest disables the limiter (tests hammer endpoints unrealistically);
these tests flip the live limiter instance on, drive past the window, and assert the
429 + Retry-After contract, then verify distinct client IPs get distinct buckets.
"""

import pytest

from app.rate_limit import limiter


@pytest.fixture
def enabled_limiter():
    limiter.enabled = True
    try:
        limiter.reset()
        yield limiter
    finally:
        limiter.enabled = False
        limiter.reset()


@pytest.mark.asyncio
async def test_invite_preview_throttles_past_the_window(client, enabled_limiter):
    headers = {"X-Forwarded-For": "203.0.113.7"}
    # 30/minute allowed; the 31st call from the same IP must 429 (the 404s for a
    # nonexistent token still count — limiting is BEFORE the lookup, by design).
    statuses = []
    for _ in range(31):
        r = await client.get("/api/v1/invites/not-a-real-token", headers=headers)
        statuses.append(r.status_code)
    assert all(s == 404 for s in statuses[:30])
    assert statuses[30] == 429
    final = await client.get("/api/v1/invites/not-a-real-token", headers=headers)
    assert final.status_code == 429
    assert "retry-after" in {k.lower() for k in final.headers}


@pytest.mark.asyncio
async def test_distinct_ips_get_distinct_buckets(client, enabled_limiter):
    # Exhaust one IP's window; a different client IP is unaffected.
    for _ in range(31):
        await client.get("/api/v1/invites/tok", headers={"X-Forwarded-For": "198.51.100.1"})
    blocked = await client.get("/api/v1/invites/tok", headers={"X-Forwarded-For": "198.51.100.1"})
    other = await client.get("/api/v1/invites/tok", headers={"X-Forwarded-For": "198.51.100.2"})
    assert blocked.status_code == 429
    assert other.status_code == 404  # fresh bucket — not throttled


@pytest.mark.asyncio
async def test_join_has_a_tighter_window(client, enabled_limiter):
    headers = {"X-Forwarded-For": "192.0.2.9"}
    statuses = [
        (await client.post("/api/v1/invites/tok/join", headers=headers)).status_code
        for _ in range(11)
    ]
    assert all(s == 404 for s in statuses[:10])
    assert statuses[10] == 429


@pytest.mark.asyncio
async def test_successful_preview_passes_through_the_limiter(client, engine, enabled_limiter):
    """The 200 path: slowapi injects X-RateLimit headers into the endpoint's Response —
    without a `response` param the injection raises and a VALID invite preview 500s
    (the bug the avatar e2e caught on deployed staging-e2e; 404/429 paths short-circuit
    before injection, which is why the original tests missed it)."""
    create = await client.post("/api/v1/groups", json={"name": "RL Group"})
    assert create.status_code == 201
    gid = create.json()["id"]
    share = await client.post(f"/api/v1/groups/{gid}/invite")
    assert share.status_code in (200, 201)
    token = share.json().get("token") or share.json().get("invite_token")
    assert token
    r = await client.get(f"/api/v1/invites/{token}", headers={"X-Forwarded-For": "203.0.113.99"})
    assert r.status_code == 200  # the regression: this 500'd without the response param
    assert "x-ratelimit-limit" in {k.lower() for k in r.headers}
