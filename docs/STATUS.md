# Project Status — Gastify
<!-- Snapshot of where the project stands. Updated during housekeeping passes, not per-commit. -->

**As of:** 2026-06-05 · **Maturity:** MVP · **Branch:** `feat/phase6-items-reports`

Gastify is a Chilean smart expense tracker (AI receipt scanning, multi-currency
analytics, PWA + native mobile) — a rebuild of the legacy BoletApp on FastAPI +
Postgres + React. This doc is the one-page "where are we" snapshot. The fine-grained
execution plan lives in [.kdbp/PLAN.md](../.kdbp/PLAN.md); the architecture map is
[architecture.md](architecture.md).

## Headline

**Feature parity with legacy BoletApp is reached.** Every customer-facing surface —
scanning, ledger, statements, dashboards, trends, groups, items, and reports — is
**shipped to production** on both web and Android. The remaining roadmap is the
Notification Center (next), then compliance + launch hardening.

## Phase status

PLAN phases map to ROADMAP phases as below. All shipped phases are in production
(promoted `staging` → `main`).

| PLAN phase | ROADMAP | State | Proof |
|------------|---------|-------|-------|
| 1 — Settings + Profile + Themes | P10 | ✅ Shipped | web + S23 |
| 2 — Batch Ops + Category Mgmt | P11 | ✅ Shipped | web + S23 |
| 3 — Batch Scanning | P12 | ✅ Shipped | web + S23 |
| 4 — Dashboard + Charts/Trends | P13 | ✅ Shipped | web + S23 |
| 5 — Groups (personal + shared) | (pulled forward, D69) | ✅ Shipped | web + S23 + PG-RLS pytest |
| 6 — Items View + Reports | P14 | ✅ Shipped | web; S23 reports-granularity proof deferred (P64) |
| 7 — Notification Center | P15 | ⬜ Next | — |
| — Compliance + Launch Hardening | P16 | ⬜ Pending | — |

Foundation phases P1–P6 (backend, scan pipeline, web MVP, mobile MVP, statements,
insights) are complete and in production.

## What's live in production

- **Scanning** — Gemini vision extraction → coalescing → V4 categorization → math
  gate → review signals, with SSE (web) / WebSocket+poll (mobile) progress. Batch
  scan (N sequential, post-persist review).
- **Ledger** — paginated transactions, inline edits (optimistic + rollback),
  multi-select batch ops, learned category/merchant management.
- **Statements** — PDF upload (password-protected), Gemini/PyMuPDF extraction,
  reconciliation buckets, card alias CRUD (no PCI).
- **Analytics** — monthly dashboard (donut, top categories, gravity centers, item
  flags), trends (server-aggregated drill-down tree + time series), scope-aware.
- **Groups** — create/list/detail, scope switcher, invite links, roles, consent-gated
  detail (D73), group avatar (D75), share-to-group with content-lock (D74). RLS
  scope-swap validated by `app_is_scope_member` oracle.
- **Items** — cross-transaction item search with filters, infinite scroll, deep-link
  to source.
- **Reports** — period spending cards at **week / month / quarter / year** granularity
  (D77; ISO-week bucketing added in `/insights/series`).
- **Settings** — 3 color themes × light/dark, locale (es/en), consent UI, data export.

## Test / CI / deploy state

- **Backend** — pytest (SQLite fast lane + Postgres-gated RLS isolation suite).
- **Web** — vitest (64+ green) + Playwright E2E journeys against deployed staging-e2e.
- **Mobile** — Jest unit + Maestro on physical Android S23 (iOS deferred, D47).
- **CI gate** — SCA audit (pip-audit), type checks, test suites must be green before
  Railway promotes a deploy.
- **Environments** — local (SQLite, mock Gemini), staging-e2e (Postgres, forced
  fixture/mock — D76), staging + production (Postgres, real Gemini).
- **Deploy flow** — feature branch → `push origin HEAD:staging` (Railway deploys
  staging-e2e + CI) → B2 proofs (web Playwright + S23 Maestro) → fast-forward promote
  `staging` → `main` (production).

## Deferred / not yet built

| Item | Tracked | Note |
|------|---------|------|
| S23 Maestro reports-granularity proof | P64 (PENDING) | Device offline; mobile covered by Jest until reconnect |
| Notification Center | PLAN Phase 7 / P15 | Next active phase |
| Compliance + launch hardening | P16 | Four-jurisdiction readiness + cutover drill |
| iOS runtime testing | D47 | Framework supports it; device proof post-roadmap |
| Structured-boleta QR shortcut | P17 | Post-MVP cost optimization |
| Cohort benchmarking (DP) | P18 | Post-MVP, consent-gated |
| Per-group analytics cache (ETag) | D69 | MVP uncached |
| Multi-model LLM fallback | D29 | Single Gemini provider until volume justifies |
| Offline editing + background sync | D40 | Online-required for MVP |

## Key references

- Architecture map — [architecture.md](architecture.md)
- Per-subsystem deep dives — [wells/](wells/) (G1–G7)
- Execution plan — [.kdbp/PLAN.md](../.kdbp/PLAN.md)
- Decisions + rationale — [.kdbp/DECISIONS.md](../.kdbp/DECISIONS.md)
- Roadmap — [.kdbp/ROADMAP.md](../.kdbp/ROADMAP.md)
- Legacy feature matrix — [APP-STATE.html](APP-STATE.html)
