<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md -->
# P16 — Data-Class Retention / Erasure Matrix

> **P16 Phase 2 (Consent + Retention) deliverable + the Phase-5 self-attestation checklist input.**
> Engineering's defensible read for the four launch jurisdictions (Chile Law 21.719, EU GDPR,
> Canada PIPEDA, US CCPA/CPRA) — **NOT legal advice** (D88: self-attested, no external counsel;
> counsel-review trigger = EU scale / special-category volume / budget). Built from a 15-agent
> adversarial validation of the live code (LEDGER 2026-06-10).

For every personal-data table: does **erasure** (`delete_user_personal_data`, D89/D82) remove it,
does the **retention job** purge it on a TTL, and does any regime mandate a **minimum-keep**? The
invariant the matrix proves: every personal table is reachable by an erasure or retention path
(no orphaned-PII hoarding), and nothing mandated-keep is silently deleted without a documented
rationale.

## Matrix

| Table | Erasure | Retention TTL | Mandate min-keep | Verdict |
|---|---|---|---|---|
| transactions | hard-delete by scope (D89/D82) | no | **review** — `receipt_scanning` register says "account + 7y"; SII/tax ~6y. Read: Art 17(1) erasure of the user's OWN copy wins; the 7y duty binds the controller's books, not a personal copy | review |
| transaction_items | yes (via txn scope) | no | none (line-item detail) | ok |
| transaction_item_flags | yes (by scope) | no | none (user-private flags) | ok |
| transaction_images | yes (DB row; on-disk blob best-effort only for scans) | no | none (the erasable receipt image) | ok |
| scans | yes (by scope) | **yes** — terminal + processed_at > 90d; NOT RLS-bound, purge works | none (transient; 7y lives with the txn) | ok |
| statements | yes (by scope) | no | review — financial record, weaker txn tension; read: erasure wins | review |
| statement_lines | yes (via statement scope + cascade) | no | none | ok |
| statement_reconciliation_runs | yes (by scope) | no | none | ok |
| statement_reconciliation_verdicts | yes (via run scope) | no | none | ok |
| card_aliases | yes (by scope) | no | none (label only, no PAN) | ok |
| notifications | yes (by scope) | no | none | ok |
| merchant_mappings | yes (by scope) | no | none | ok |
| category_mappings | yes (by scope) | no | none | ok |
| credit_balances | yes (by scope) | no | none (scan-credit/plan plumbing) | ok |
| **mobile_push_tokens** | **yes (FIXED Phase 2)** — added to `delete_user_personal_data`; was orphaned PII | no | none (device token = operational PII; erasure must delete) | ok (was orphaned-pii) |
| users | scrubbed (email=NULL, name=[REDACTED]); shell retained (D89). `firebase_uid`/`locale` NOT scrubbed | no | none (shell is the proof anchor) | review → P75 |
| consent_records | retained (revoked) + ip/user_agent scrubbed — the consent proof | no (keep-forever) | **yes** — GDPR Art 7(1)/Law 21.719 accountability; revoked PII-free record IS the proof | ok (TTL asymmetry → P74) |
| audit_events | retained + ip scrubbed; **dsr_\* now EXEMPT from purge** (migration 037) | **yes** — non-dsr rows > ~6y purged (via the migrator-owned SECURITY DEFINER, fixes the FORCE-RLS zero-rows trap) | **yes** — Art 5(2)/Law 21.719 accountability | ok (proof window → P76) |
| group_stat_tombstones | NO (correctly) — created BY erasure (D82 void); non-personal; group-scoped | no | n/a — deleting would un-void a group stat; must persist | ok |
| ownership_scope_members | partial — group memberships removed by account-delete; personal owner-membership retained | no | none | ok |
| ownership_scopes | retained (empty personal shell, the proof anchor) | no | none | ok |
| processing_register / fx_rates / currencies / store_categories / item_categories | NOT personal data (global catalogs / reference / FX cache) | no | register itself = Art 30 record (persist) | ok |

**Erasure coverage:** `delete_user_personal_data` covers 15 personal-scope tables soundly after the
Phase-2 `mobile_push_tokens` fix — every `ownership_scope_id`-bearing personal table is now reachable.

## Phase-2 fixes applied (the matrix is green because of these)

1. **Retention purge now actually runs** — `.github/workflows/retention.yml` (daily cron → `run_retention.py --apply`). Was an orphan script (railway.toml ran only alembic+uvicorn). Exit signal (d).
2. **Retention purge deletes on Postgres** — migration 037 drops FORCE on `audit_events` + adds a migrator-owned `SECURITY DEFINER` purge (mirrors D71). The runner (least-privilege `gastify_app`, no GUC) used to delete ZERO audit rows under FORCE-RLS while reporting success.
3. **dsr_\* proof events exempt** — the `dsr_erasure` event (sole durable erasure proof after hard-delete) no longer ages out at the generic 6y clock.
4. **mobile_push_tokens** — closed the orphaned-PII gap (now hard-deleted on erasure).
5. **Consent revocation proven at the cohort OUTPUT** — revoke/erasure drop the user from the DP aggregate, not just an eligibility boolean (D90).

## Residuals → Phase-5 go/no-go (fix-or-accept, never silent)

| ID | Item | Per-regime note |
|---|---|---|
| (existing) | Financial-record min-retention vs hard-delete | THE sharpest tension. CL/SII 6y, EU VAT 6–10y, CRA 6y, IRS 3–7y all bind the BUSINESS's books, not a personal tracker's user copy. Read: unconditional erasure is correct + safe. Decide whether **business-tier / sole-trader** users (gastify-as-books) need a retention hold. |
| P74 | consent_records keep-forever asymmetry | Keep-forever is defensible (PII-free rows = the mandated proof). Ratify as an explicit decision or set a TTL aligned to the DSR-proof/limitation window. |
| P76 | dsr-proof retention window | Even after the carve-out, decide the EXACT proof-of-DSR window (limitation-period-aligned). 6y operational clock may be too short; bound it in the attestation. |
| P77 | cohort OUTPUT consumer (P9) | Revoke unflags eligibility instantly (proven). The deployed roster→DP-aggregate join is P9 machinery; add an output-level fix-or-accept when that consumer ships. |
| P75 | re-identification residue | `firebase_uid` survives anonymization (re-link vector). Decide vs GDPR Recital 26; document the anchor rationale. |
| P78 | audit_events "append-only" claim | The table is commented append-only but no trigger enforces it (and can't — scrub UPDATEs ip, purge DELETEs rows). Implement a governed-mutations-only trigger OR correct the claim. |
| P79 | register TTLs vs enforced retention | The processing register declares per-purpose windows; the runner enforces only scans-90d + audit-6y. Reconcile the Art-30 record with actual behavior. |
| P72 | GDPR Art 20 portability of group shares | Group-shared copies aren't exportable. Real GDPR residual; narrower under PIPEDA/CCPA. |

## Jurisdiction summary (engineering's read; uncertainty flagged)

- **Chile (Law 21.719 + SII):** erasure-scope + instant revocation strongly defensible; 90d/6y fine. Residual: the regime's enforcement agency is new (~2026, unlitigated).
- **EU (GDPR — heaviest liability):** Art 7(3) withdrawal strongly satisfied (live-derived). The two items that most weakened a self-attestation are now FIXED (the never-running purge + the FORCE-RLS zero-rows audit purge); remaining GDPR-specific residual = Art 20 group-data portability (P72).
- **Canada (PIPEDA + CRA):** lowest-risk. PIPEDA 4.5.3 *requires* destruction when no longer needed, so hard-delete ALIGNS / over-satisfies. CRA s230 6y binds the business's books, not the personal copy.
- **US (CCPA/CPRA — most deletion-friendly):** right-to-delete satisfied; over-deletion is the safe direction. CPRA retention-disclosure duty is now backed by an actually-running purge.

**Highest-stakes open question (all four):** financial-record minimum-retention vs on-request hard-delete — the code correctly deletes the user's personal copy; Phase 5 documents per regime WHY no statutory hold binds a personal tracker, and decides the business-tier question.
