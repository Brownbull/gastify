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


# --- ★2 interim statement-upload cap (RATE-LIMIT-PLAN Phase 1) ---


def _pdf_upload(consent: bool = False):
    """Minimal multipart body. consent=False 422s fast (no provider work) — limiting
    runs in the route wrapper BEFORE the body, so cheap 422s still count, exactly
    like the invite 404s above."""
    return {
        "files": {"file": ("s.pdf", b"%PDF-1.4 tiny", "application/pdf")},
        "data": {"ai_processing_consent": "true" if consent else "false"},
    }


@pytest.mark.asyncio
async def test_statement_upload_throttles_daily(client, enabled_limiter):
    statuses = []
    for _ in range(6):
        r = await client.post("/api/v1/statements", **_pdf_upload())
        statuses.append(r.status_code)
    assert all(s == 422 for s in statuses[:5])  # consent-less uploads, cheap
    assert statuses[5] == 429
    blocked = await client.post("/api/v1/statements", **_pdf_upload())
    assert blocked.status_code == 429
    assert "retry-after" in {k.lower() for k in blocked.headers}


@pytest.mark.asyncio
async def test_statement_limit_keys_on_the_user_not_the_ip(client, enabled_limiter):
    """The same authenticated user must share ONE bucket across addresses — a
    rotating-IP loop may not reset the window."""
    for i in range(5):
        await client.post(
            "/api/v1/statements",
            headers={"X-Forwarded-For": f"203.0.113.{i}"},
            **_pdf_upload(),
        )
    rotated = await client.post(
        "/api/v1/statements", headers={"X-Forwarded-For": "203.0.113.250"}, **_pdf_upload()
    )
    assert rotated.status_code == 429  # fresh IP, same user → still throttled


# --- Phase 3: ENT HIGH limits (group churn, consent toggles, DSR exports) ---
#
# The limiter runs in the route wrapper BEFORE the handler body, so a limit can be
# driven to 429 regardless of the eventual business outcome (a sole-admin leave 409s,
# but the 409s still count toward the window — same shape as the invite-404 tests).


async def _make_group(client, name="RL Churn") -> str:
    created = await client.post("/api/v1/groups", json={"name": name})
    assert created.status_code == 201
    return created.json()["id"]


@pytest.mark.asyncio
async def test_group_leave_per_group_window_is_per_group(client, enabled_limiter):
    """The tight 3/day leave window is keyed (user, group): the 4th leave on ONE
    group 429s, but a DIFFERENT group is a fresh bucket — churning group A must not
    spend group B's budget."""
    group_a = await _make_group(client, "RL A")
    group_b = await _make_group(client, "RL B")

    statuses = [
        (await client.post(f"/api/v1/groups/{group_a}/leave")).status_code for _ in range(4)
    ]
    # Sole-admin owner can't actually leave → 409s, but they count toward the window.
    assert statuses[:3] == [409, 409, 409]
    assert statuses[3] == 429

    # group_b is a separate (user, group) bucket — not throttled by group_a's churn.
    other = await client.post(f"/api/v1/groups/{group_b}/leave")
    assert other.status_code == 409  # business 409, NOT 429


@pytest.mark.asyncio
async def test_consent_grant_throttles_per_day(client, enabled_limiter):
    """10 consent changes/day/user — the 11th grant 429s. Each grant writes an
    append-only audit row, so the loop is a storage-growth vector."""
    statuses = []
    for _ in range(11):
        r = await client.post(
            "/api/v1/consent/analytics/grant",
            json={"jurisdiction": "CL", "consent_version": "1.0"},
        )
        statuses.append(r.status_code)
    assert all(s == 201 for s in statuses[:10])
    assert statuses[10] == 429
    assert "retry-after" in {
        k.lower()
        for k in (
            await client.post(
                "/api/v1/consent/analytics/grant",
                json={"jurisdiction": "CL", "consent_version": "1.0"},
            )
        ).headers
    }


@pytest.mark.asyncio
async def test_consent_grant_and_revoke_share_the_window(client, enabled_limiter):
    """grant + revoke draw from the SAME per-day consent-toggle budget (a flip-flop
    is the abuse, so mixing them must not double the allowance)."""
    for _ in range(5):
        assert (
            await client.post(
                "/api/v1/consent/marketing/grant",
                json={"jurisdiction": "CL", "consent_version": "1.0"},
            )
        ).status_code == 201
        assert (await client.post("/api/v1/consent/marketing/revoke")).status_code == 200
    # 10 toggles spent; the 11th (either verb) 429s.
    assert (await client.post("/api/v1/consent/marketing/revoke")).status_code == 429


@pytest.mark.asyncio
async def test_erasure_throttles_at_two_per_day(client, enabled_limiter):
    """Erasure is a heavy cascade; 2/day/user. The 3rd call 429s before any work."""
    # The first erasure scrubs the mock user; subsequent calls still pass the limiter
    # until the window is hit (the handler is idempotent-ish on an already-scrubbed user).
    s1 = (await client.post("/api/v1/privacy/erasure")).status_code
    s2 = (await client.post("/api/v1/privacy/erasure")).status_code
    s3 = (await client.post("/api/v1/privacy/erasure")).status_code
    assert s1 in (200, 201)
    assert s2 in (200, 201)
    assert s3 == 429


@pytest.mark.asyncio
async def test_dsr_exports_share_one_export_budget(client, enabled_limiter):
    """Portability + data-access serve up-to-10k-row exports and draw from ONE shared
    4/hour/user budget (both are the same expensive 'give me everything' operation, so
    alternating them must not double the allowance). The success path returns 200 with
    rate-limit headers — proving the Response param prevents the header-injection 500."""
    # Alternate the two endpoints: 4 total succeed, the 5th (either) 429s.
    paths = ["/api/v1/privacy/data-access", "/api/v1/privacy/portability"] * 3
    statuses = [(await client.get(p)).status_code for p in paths[:4]]
    assert all(s == 200 for s in statuses), statuses
    blocked = await client.get(paths[4])
    assert blocked.status_code == 429
    assert "retry-after" in {k.lower() for k in blocked.headers}


@pytest.mark.asyncio
async def test_dsr_export_success_path_carries_ratelimit_headers(client, enabled_limiter):
    """A 200 export must inject X-RateLimit-* — the exact regression that 500s when a
    limited endpoint lacks the Response param."""
    r = await client.get("/api/v1/privacy/data-access")
    assert r.status_code == 200
    assert "x-ratelimit-limit" in {k.lower() for k in r.headers}
