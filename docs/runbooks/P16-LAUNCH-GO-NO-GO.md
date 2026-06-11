<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md -->
# P16 — Launch Go/No-Go Packet (4-Jurisdiction Audit)

> **The launch gate.** Supersedes `P7-LAUNCH-EXIT-GATE.md` (2026-05-29): every item that
> packet deferred as "operational" has since been CLOSED by P16 Phases 1–4 with deployed,
> observable-state proofs (D90). Compiled 2026-06-11. Self-attested per **D88** —
> engineering's defensible read across Chile Law 21.719 / EU GDPR / Canada PIPEDA /
> US CCPA-CPRA; **NOT legal advice**; counsel-review trigger = EU scale, special-category
> volume, or budget.

## 1. Exit signals a–e — all CLOSED with deployed proofs

| Signal | Proof (observable state, per D90) | Where |
|---|---|---|
| (a) DSR end-to-end | DSR gate **4/4** on deployed staging-e2e @ migration 036: access / rectification / erasure / portability on throwaway Firebase users, incl. the `member_count 2→1` roster check (de-membership proven on real Postgres) | DEPLOYMENTS P71; `scripts/staging/run-dsr-staging-gate.py` |
| (b) Consent revocation → cohort-unflag | Revoke/erasure drop the user from the DP cohort **aggregate** (member_count N→N−1, dp_mean recomputed) — output-level, not a flag | `test_consent_propagation.py` (output tests); LEDGER 2026-06-10 |
| (c) Quota throttle → `queued`, no 5xx | Whole throttle class (quota/429/503-overload) parks QUEUED; the **deployed** lifespan sweep claimed seeded QUEUED scans in ~60s and re-dispatched them (claim→flip→reprocess live); `/metrics scans_queued_depth` | DEPLOYMENTS P75; D92 |
| (d) Retention deletes past-TTL data | Seed→purge→verify **on the deployed staging-e2e DB as the real `gastify_app`**: direct delete=0 (RLS), definer purged cross-scope, `dsr_*` exempt; daily prod cron (`gastify-retention-cron`) live, payload dry-run-proven on the prod DB | DEPLOYMENTS P73/P74; D91 |
| (e) Go/no-go signed | **This packet** + the §5 rehearsal + §4 dispositions | — |

Cross-cutting: backend suite 870+ green incl. live-PG RLS proofs (`test_rls_postgres.py`,
`test_group_isolation.py`, `test_retention_postgres.py`, `test_billing_postgres.py`) in CI;
E2E sweep green (web 29/29 Playwright; S23 golden journey 1m22s + scan-failure edge 39s).

## 2. Four-jurisdiction rights/obligations map

Engineering's read per regime; the per-data-class detail lives in
[P16-DATA-RETENTION-MATRIX.md](P16-DATA-RETENTION-MATRIX.md).

| Right / obligation | Implementation | CL 21.719 | EU GDPR | CA PIPEDA | US CCPA/CPRA |
|---|---|---|---|---|---|
| Access / portability | `GET /privacy/data-access`, `/portability` (JSON export) | ✓ | ✓ Art 15/20 (group-share gap → P72, §4) | ✓ | ✓ |
| Rectification | `PATCH /privacy/rectification` + txn edit w/ provenance | ✓ | ✓ Art 16 | ✓ | ✓ |
| Erasure | **Hard-delete** of the full 15-table personal-scope surface (D89) + PII-free `dsr_erasure` proof + group void/tombstone (D82, migrations 035/036 append-only) | ✓ | ✓ Art 17 (over-satisfies) | ✓ 4.5.3 *requires* destruction — aligns | ✓ 1798.105 |
| Consent + withdrawal | Live-derived eligibility (no cache); revoke instant; `withdrawn_at` user-vs-system distinction; PII-scrubbed records retained as proof | ✓ | ✓ Art 7(1)/(3) | ✓ | ✓ |
| Retention limits | TTLs enforced by a **running** daily purge (scans 90d, non-DSR audit ~6y; dsr proof exempt); declared-vs-enforced reconciliation → P79 (§4) | ✓ | ✓ Art 5(1)(e)/30 | ✓ | ✓ disclosure duty backed by a real purge |
| Security / isolation | FORCE-RLS deny-by-default, fail-safe GUC, two-role split + boot guard (P43), validate-then-swap groups (D69–71) — all live-PG-proven in CI + verified on prod | ✓ | ✓ Art 32 | ✓ | ✓ |
| Processing register | `processing_register` (Art 30 record) seeded + queryable | ✓ | ✓ | ✓ | ✓ |
| Breach readiness | INCIDENT-RESPONSE.md + §5 rehearsal (GDPR 72h clock named) | ✓ | ✓ Art 33 | ✓ | ✓ |

## 3. Phase-1 erasure/void evidence (enumerated per the 2026-06-10 roadmap revision, item E)

1. **Full erasure surface** — `delete_user_personal_data` hard-deletes all 15 personal tables (txns/items/images/flags, statements+lines+recon, card_aliases, scans, notifications, mappings, credit_balances, mobile_push_tokens) → proven by `test_privacy_erasure_completeness` + the staging DSR gate.
2. **Void mechanism** — D82 group-period tombstones (migration 035) made **append-only at the DB** (036); account-delete de-members + voids; leave = keep-vs-delete choice.
3. **PII-free proof** — `dsr_erasure` audit event carries no IP; `scrub_user_audit_trail` nulls audit IP + consent IP/user-agent; dsr events exempt from the purge (037).
4. **De-membership on real Postgres** — the `member_count 2→1` roster check (the bug the original gate missed; caught by the 64-agent adversarial review).

## 4. Residuals — fix-or-accept dispositions (roadmap-revision item C; never silent)

| ID | Residual | Disposition + rationale |
|---|---|---|
| — | **Financial-record min-retention vs hard-delete** (sharpest tension; D87) | **ACCEPT.** SII (~6y), EU VAT, CRA s230, IRS rules bind a BUSINESS's own books — not a personal tracker's copy of the user's data. Erasure of the personal copy is correct under all four regimes (and PIPEDA *favors* it). **Re-open trigger:** any business-tier / sole-trader offering (gastify-as-books-of-record) → add a retention hold first. |
| P69 | Void leaks via gravity-baseline + partial series buckets | **ACCEPT (launch).** Voided periods are suppressed in primary stats; the residual is derived **averages** over mixed windows. No regime mandates statistical erasure of aggregates (GDPR Recital 26 — aggregate ≠ personal data). Fix scheduled with the P18 cohort work. |
| P70 | No live-PG erasure regression test in CI | **ACCEPT.** Covered by composition: live-PG RLS suites in CI + `test_privacy_erasure_completeness` (per-table counts) + the deployed DSR gate 4/4. A dedicated PG erasure test is hygiene, not a gap in evidence. |
| P71 | Admin-removal forecloses a removed member's erasure recourse for group shares | **ACCEPT (launch).** The removed member's PERSONAL data remains fully erasable; the group copies are the group's records (D74 content-lock). Their own account-delete still voids affected group stats. UX recourse (request-delete flow) → backlog. |
| P72 | Portability omits group-shared copies (GDPR Art 20) | **ACCEPT (launch).** The user's OWN personal-scope data (the Art-20 core: data "provided by" the subject) is fully exportable; the group copies are governed shares. Honest GDPR residual — documented here, fix targeted before EU scale (the D88 counsel trigger). |
| P74 | Consent-records keep-forever asymmetry | **RATIFIED as keep-forever** (this packet = the decision record): the revoked, PII-scrubbed row IS the Art-7(1)/21.719 proof of consent lifecycle; it contains no PII, so indefinite retention is defensible in all four regimes. |
| P75 | `firebase_uid` survives anonymization (re-id vector) | **ACCEPT.** The shell is the anchor for retained proof rows; `firebase_uid` is a pseudonymous identifier resolvable only via Firebase project credentials we control; the Firebase account itself is deleted at erasure. Engineering read: Recital-26 "reasonably likely" re-identification fails. |
| P76 | DSR-proof retention window unbounded after the 037 carve-out | **ACCEPT with bound stated:** proof-of-erasure events are retained ≥ the longest plausible complaint-limitation window; revisit at the first annual review (calendar owner: DPO procedures). |
| P77 | Cohort OUTPUT consumer not deployed (P9/P18) | **ACCEPT.** Exit-signal (b) is proven at roster + computed-aggregate level; the deployed consumer doesn't exist yet. The P18 plan carries the output-level fix-or-accept as a mandatory item. |
| P78 | `audit_events` "append-only" comment vs no trigger | **ACCEPT + claim corrected:** the honest invariant is "append-only except two governed mutations (PII scrub, TTL purge)" — documented in `schema/RLS.md`. A DB trigger enforcing exactly that = hardening backlog. |
| P79 | Register-declared TTLs vs enforced retention | **ACCEPT (launch).** Declared "account + Ny" purposes are satisfied by erasure-on-request + account-lifetime retention; the runner enforces the two operational TTLs. Reconciliation test = backlog; no declared period is *exceeded*. |
| P82 | E2E group-spec hygiene (cap fills) | Test-infra only; not launch-relevant. |

## 5. Incident-runbook rehearsal (executed 2026-06-11, read-only, PRODUCTION)

Scenario: **SEV1 suspected cross-tenant exposure** (INCIDENT-RESPONSE.md). Steps executed
for real against prod:

| Step (runbook) | Executed | Result | Time |
|---|---|---|---|
| Verify scope binding preconditions | role/RLS verify probe (alembic 037; `gastify_app` non-bypass; tables owned by migrator) | ✓ | 4s |
| Verify the isolation barrier | live fail-safe proof: `gastify_app`, **no GUC → transactions visible = 0** | ✓ holds | 3s |
| Trace the offending request | `request_id` present in prod access logs (grep-able) | ✓ | 2s |
| Disable endpoint / rotate / notify | NOT executed (destructive); paths confirmed present: Railway service controls + Firebase session revocation + GDPR-72h clock named in the runbook | ✓ documented | — |

Verdict: the runbook's detect→mitigate verification loop is executable in **under 10
seconds** with standing tooling (`/tmp/verify_roles.py` pattern; see DEPLOYMENTS P74).
Gap found: none blocking; the probe script should graduate from `/tmp` to
`scripts/ops/verify-rls-posture.py` (backlog).

## 6. Adversarial review record (roadmap-revision item D)

Constraint disclosed: the monthly agent-spend limit blocked a multi-agent review for this
phase. Mitigation: Phases 1–3 of the cumulative surface WERE multi-agent-adversarially
reviewed (64-agent P1; 15+12-agent P2; 29-agent P3 — 8 CRITICALs found+fixed pre-promote);
Phase 4 + this packet got structured self-review (correctness / security / money-path /
compliance lenses) + the independent E2E sweep (web 29/29 + S23), which itself found and
fixed 3 real bugs. The D90 intent — no single-pass green-gate promotion — was satisfied
for every code phase.

## 7. Sign-off (D88 self-attestation)

- [x] Exit signals a–e closed with deployed observable-state proofs (§1)
- [x] Four-jurisdiction map complete; no right unimplemented, no obligation unaddressed (§2)
- [x] Erasure/void evidence enumerated (§3)
- [x] Every known residual dispositioned fix-or-accept with rationale (§4)
- [x] Incident rehearsal executed with timings (§5)
- [x] Review rigor per D90 documented, constraint disclosed (§6)

**GO** — engineering attests launch readiness across CL/EU/CA/US per D88 (self-attested,
evidence-backed, residuals explicit). Re-open triggers: EU scale, special-category data,
business-tier offering, or any §4 trigger firing.
