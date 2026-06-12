# Rate-Limit Plan — abuse surfaces and proposed limits

> Analysis requested 2026-06-12 ("identify the rate limiting cases we should implement
> in the future... avoid unnecessary repetitive behaviors and avoid exploits").
> This documents WHERE limits belong, WHY, and at what threshold — implementation is
> future work tracked in PENDING (P86). Limits are deliberately generous: a legitimate
> user should never see a 429; these bound scripts, loops, and abuse.

## What exists today

| Guard | Where | Notes |
|---|---|---|
| slowapi limiter (per-IP, XFF first hop) | `backend/app/rate_limit.py` | Memory storage (fine single-replica; Redis when replicas > 1); `GASTIFY_RATE_LIMIT_ENABLED=false` in test envs; 429 + Retry-After |
| Invite preview 30/min, join 10/min | `groups.py` (P59) | The only rate-limited endpoints today |
| Batch update/delete ≤ 200 ids/request | `schemas/transaction.py` | Caps one REQUEST, not request frequency |
| Scan upload ≤ 20 MB, statement ≤ 25 MB | `scans.py`, `statements.py` | Size, not frequency |
| Scan = 1 credit, atomic deduct | `billing.py` (P16 P4) | The economic limit on receipt scans |
| Global scan-queue forced throttle | P16 P3 | Protects the QUEUE, not fairness — one user can still fill it |
| Group caps: 5/user, 50 members, 3 admins | `groups.py` | Concurrent caps, not churn caps |
| Delete window 90 days | `transactions.py` | Bounds WHICH rows are deletable, not how fast |
| Portability export ≤ 10k txns | `privacy.py` | Caps one response, not export frequency |

**Keying gap:** the current key is the client IP. Most limits below should key on the
AUTHENTICATED USER (stash `auth.user_id` on `request.state` in `get_auth_context`;
custom `key_func` reads it, falls back to IP). Per-resource limits (e.g. per
transaction) append the path param to the key.

## Tier model supersedes the cost items (D96, 2026-06-12)

The credit/tier decision changes two rows below: **statement scanning** and **batch
scanning** are now TIER-QUOTA gated, not rate-limited — Free has neither; Premium
(CLP $5.000/mo) gets 3 statement + 3 batch scans/month and 60 scan credits (Free: 20).
Monthly reset, no rollover (P87). The tiny monthly scan quotas also make a per-user
scan burst cap pointless — demoted to LOW. Until P87 ships, an interim 5/day statement
limit is the stopgap (one decorator).

## Ranked plan (priority × effort)

Effort: S < 30m · M 1–3h · L 3–8h · XL > 1d. Items above the line are P86's
implementation order; the two ★ rows are the D96 billing work (P87), listed here
because they replace former HIGH rate-limit items.

| # | Item | Priority | Effort | Why this rank |
|---|------|----------|--------|---------------|
| ★1 | D96 tier/quota system: monthly credits 20/60, statements 0/3, batch 0/3, reset + no-rollover, free-tier 403s | HIGH | XL | THE cost guard — real Gemini money; enforcement doesn't wait for the payment provider (premium = manual flag) |
| ★2 | Interim statement cap 5/day/user until ★1 ships | HIGH | S | One decorator; closes the open Gemini spend TODAY |
| 1 | User-keyed `key_func` infra (request.state.user_id; per-resource variant) | HIGH | M | Prerequisite for every row below; IP keys are wrong for authed abuse |
| 2 | Group leave 6/h + 20/day; join 20/day/user + 3/day per (user, group) | HIGH | M | Immutable audit-row growth (6y, uncleanable) + member-stat flip-flops |
| 3 | Consent toggles 10/purpose/day (both consent surfaces) | HIGH | S | Same append-only-row growth vector |
| 4 | Erasure 2/day; portability + data-access 4/h | HIGH | S | Heavy cascade / 10k-row reads; trivially loopable |
| 5 | Per-transaction edit cap 30/h (per-resource key) + 300 mutations/h/user | MED | M | The "edited many, many times" case; protects learned-mapping integrity |
| 6 | Batch-delete 10 calls/h (slowapi) + 1 000 deleted rows/day (app counter) | MED | M | 200-id cap exists; this caps FREQUENCY; the row budget needs a small app-side counter |
| 7 | Manual create 60/h + 500/day | MED | S | Storage growth + the mapping-minting feeder |
| 8 | Share-to-group 30/h + 200/day | MED | S | Spam pollutes OTHER members' lists/stats |
| 9 | Group create 10/day; invite generation 10/h per group | MED | S | Churn under the concurrent cap; rotation invalidates pending links |
| 10 | 429 handling in web + mobile (Retry-After toast) | MED | M | Ship WITH the first user-visible limits, not after |
| 11 | Push-token registrations 20/day | LOW | S | Row growth + FCM noise; unique-constraint already bounds steady state |
| 12 | Group rename/icon/visibility 30/day; role changes 10/day per group | LOW | S | UI-churn hygiene |
| 13 | Rectification 30/day; notifications mutations 120/min | LOW | S | Cheap writes |
| 14 | Insights reads 120/min/user (after caching); public /reference 60/min/IP | LOW | S | Read hammering; caching is the better first lever |
| 15 | Per-user scan burst cap | LOW | S | Demoted: 20–60 credits/MONTH self-limits bursts; global queue throttle already protects the queue |
| 16 | Redis limiter storage | LOW | M | Only when replicas > 1 or daily windows must survive deploys |

## Original analysis tables (pre-D96 detail)

Priorities: **HIGH** = real cost or irreversible-row growth, implement first.
**MED** = churn/pollution guards, implement at launch. **LOW** = hygiene, Ent tier.

### HIGH — uncovered real cost or append-only growth

| Surface | Abuse scenario | Current guard | Proposed limit |
|---|---|---|---|
| `POST /statements` upload | **Costs REAL Gemini in prod and is NOT credit-gated** — a loop burns provider budget directly | 25 MB size only | Credit-gate like scans (preferred), else 5/day/user + 2/hour |
| `POST /groups/{id}/leave` | Leave-delete writes an immutable personal audit row per call (6-year retention, append-only — cannot be cleaned) + tombstone churn; join→leave flip-flop flips other members' stats | none | 6/hour/user, 20/day/user; plus 3 joins/day per (user, group) for flip-flop |
| `POST /invites/{token}/join` | Membership churn (the other half of the flip-flop) | 10/min/IP | + 20 joins/day/user (user-keyed) |
| Consent grant/revoke (`/consent/{purpose}/grant\|revoke`, `/groups/{id}/consent`) | Every toggle writes an append-only audit row — storage-growth loop | none | 10 changes/purpose/day/user |
| `POST /privacy/erasure` | Heavy cascade (deletes + group voids + scrubs); repeated calls re-run it all | none | 2/day/user |
| `GET /privacy/portability`, `/data-access` | Up-to-10k-row export reads — cheap to request, expensive to serve | response cap only | 4/hour/user |

### MED — churn, pollution, repetitive-behavior guards

| Surface | Abuse scenario | Current guard | Proposed limit |
|---|---|---|---|
| `PATCH /transactions/{id}` | The user's case: one transaction edited "many, many times" — each merchant edit also (re)writes a learned mapping; edit-storms pollute learning + edited_at provenance | share/match locks block CONTENT edits only when locked | **Per-resource**: 30 edits/hour per transaction; global: 300 mutations/hour/user |
| `DELETE /transactions/{id}` + `POST /batch-delete` | "Delete many transactions at a time": 200-id cap × unlimited requests = unbounded bulk deletion | 200/request, 90-day window | 10 batch-calls/hour/user; 1 000 deleted rows/day/user (sum of both paths) |
| `POST /transactions` (manual create) | Unbounded storage growth; also the feeder for mapping-minting (create + rename loops) | name/qty/price validation | 60/hour/user, 500/day/user |
| `POST /groups/{id}/share` | Spam-sharing floods OTHER members' lists + statistics (copies land in the shared scope) | re-share dedup 409 | 30/hour/user, 200/day/user |
| `POST /groups` (create) | Create→delete churn under the 5-group concurrent cap | 5 concurrent | 10 creations/day/user |
| `POST /groups/{id}/invite` (generate) | Token ROTATION churn — each call invalidates the prior link (denial-of-convenience for pending invitees) + link spam | none | 10/hour per group |
| `POST /scans` | Credit-gated, but the global queue throttle is not per-user — one paid user's burst starves everyone | credits + global throttle | 30/hour/user fairness cap |
| `POST /push-tokens` register | Registration loop → token-row growth + APNs/FCM noise | unique (user, token) | 20 registrations/day/user |

### LOW — hygiene (Ent tier)

| Surface | Abuse scenario | Current guard | Proposed limit |
|---|---|---|---|
| `PATCH /groups/{id}` rename / `icon` / `visibility` | Rename/avatar/visibility toggle storms (UI churn for other members) | role gates | 30/day per group |
| Member role changes (`PATCH /members/{uid}`) | Admin flip-flop (promote/demote loops confuse the D94 succession order) | 3-admin cap | 10/day per group |
| `POST /privacy/rectification` | Profile-write loop | validation | 30/day/user |
| Insights reads (`/insights/*`) | Aggregation hammering (tree builds are the heaviest reads) | none | 120/min/user (generous; add caching first) |
| Public reference reads (`/reference/*`, unauthenticated) | Anonymous scraping/hammering of the public lists | none | 60/min/IP |
| Notifications mutations (mark-read/all, delete) | Cheap row flips | pagination caps | 120/min/user (nicety) |

## Non-goals / already-bounded (verified, no limit needed)

- **Learned mappings**: dedup per normalized `original_merchant` (update-in-place) —
  growth is bounded by distinct names, and minting names costs transaction creates
  (limited above).
- **Tombstones**: idempotent per (group, month) — repeated leave-deletes do not grow
  the table.
- **Re-share of the same source**: 409 dedup.
- **Sign-in brute force**: Firebase's surface, not ours.
- **Invite token brute force**: 192-bit tokens + the existing P59 IP limits.

## Implementation notes (for the future pass)

1. User-keyed `key_func`: `get_auth_context` stashes `request.state.user_id`; the
   key_func prefers it over IP. Per-resource keys append the path param
   (`f"{user_id}:{transaction_id}"`).
2. Daily windows on slowapi memory storage reset on redeploy — acceptable for
   defense-in-depth; move to Redis storage when replicas > 1 or when daily windows
   must survive deploys.
3. Keep `GASTIFY_RATE_LIMIT_ENABLED=false` in staging-e2e (the suites hammer
   endpoints by design); add one contract test per limited endpoint asserting the
   429 + Retry-After shape with the limiter enabled.
4. The statement credit-gate is the one item here that is arguably a BILLING change,
   not a rate limit — decide it with the payment-provider/credit-UX work.
5. Surface 429s in the clients: both web and mobile should map 429 + Retry-After to
   a friendly "too fast, try again in a moment" toast (a new shared error path).
