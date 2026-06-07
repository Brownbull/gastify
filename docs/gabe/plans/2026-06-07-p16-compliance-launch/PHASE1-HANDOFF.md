# P16 Phase 1 (DSR) — Session Hand-off

> **Date:** 2026-06-07 · **Branch:** `feat/phase6-items-reports` · **HEAD:** `1e9e7e1`
> **Resume at:** Phase 1 **T3** (tombstone infrastructure). Exec=🔄. T1 + T2 done + pushed.

This hand-off lets a fresh session resume P16 Phase 1 without re-deriving the grounding.
The durable state lives in `.kdbp/` (PLAN, DECISIONS, LEDGER); this doc adds the
session-specific findings + the exact resume pointers per remaining task.

---

## 0. Continuation prompt (paste into the fresh session)

```
Resume P16 Phase 1 (Data-Subject Rights) on branch feat/phase6-items-reports.
Read docs/gabe/plans/2026-06-07-p16-compliance-launch/PHASE1-HANDOFF.md first, then
.kdbp/PLAN.md (Current Phase = 1, Exec=🔄) + DECISIONS D82 rev3, D88, D89, and the D4
amendment. T1 (validate the 4 existing DSR rights) and T2 (erasure → hard-delete,
committed f028c84) are DONE. Continue via /gabe-execute starting at T3:

  T3 — group_stat_tombstone model + Alembic migration 035 (after 034_notifications) +
       wire the insights/ stats layer to honor it (void a tombstoned group-period stat).
  T4 — account-delete erasure also revokes visibility of the user's shared group copies
       (Transaction.shared_by_user_id == user_id) + tombstones the affected (group,period)
       stats (D82, D74: revoke visibility, don't mutate the content-locked copy). Two-user
       fixture proof.
  T5 — extend POST /{group_id}/leave (api/groups.py:523, currently "keep") with the
       keep-vs-delete CHOICE (delete → reuse T3/T4 void for that group only).
  T6 — staging runtime proof (REQUIRED, gates Exec=✅): push HEAD:staging, all 4 rights on
       a throwaway test user + the two-user void/choice fixture vs the deployed staging-e2e
       URL, artifacts logged.

ent tier, data-safety: TDD + the live-PG harness for the delete/void paths, adversarial
review before promote, never raw git commit (use /gabe-commit), no Co-Authored-By. Erasure
is irreversible — verify FK order + that you never void/delete the wrong scope.
```

---

## 1. Why this phase exists (context)

P16 = **Compliance + Launch Hardening** (the launch gate). Phase 1 = **Data-Subject
Rights**. The pre-flight discovery (**D89**): the four DSR rights already exist in
`backend/app/api/privacy.py`, so P16 is **validate-and-fill-gaps**, not build-from-scratch.
The new work is: erasure hard-delete (T2 ✅) + the D82 group void/tombstone (T3–T5) + the
staging proof (T6).

## 2. Decisions to honor (read before coding)

| Decision | What it binds |
|---|---|
| **D82 rev 3** | Account-delete = TOTAL (hard-delete own + revoke/void shared group copies' affected stats). Group-leave = the only keep-vs-delete CHOICE. Void via tombstone, never recompute. |
| **D88** | Compliance sign-off = self-attestation (no external counsel); evidence-backed checklist at the Phase-5 gate. Residual liability accepted; counsel-review trigger = EU scale. |
| **D89** | The 5 P16 execution decisions + the validate-and-fill-gaps reframe + the erasure hard-delete (amends D4). |
| **D4 (amended)** | Erasure = hard-delete the data + keep the PII-free `dsr_erasure` audit event. (Was anonymize-in-place.) The audit-event requirement is preserved. |
| **D74** | Group copies are content-locked. Revoke **visibility**, do NOT mutate the copy. |
| **D69/D70/D71** | The scope-swap is read-only (via `resolve_scope`); `auth.ownership_scope_id` is ALWAYS the user's personal scope — the erasure delete can't hit a group scope. |

## 3. What's done

### T1 — Validate the 4 rights ✅
- `backend/app/api/privacy.py` has `data-access`, `rectification`, `erasure`, `portability`; each emits a `dsr_*` audit event. **27 privacy+consent tests green.**
- `access` = summary (profile + consents + txn **count**); `portability` = full machine-readable export (transactions, 10k limit + `truncated` flag). Defensible GDPR split.
- Phase-5 checklist nuance (not blocking): confirm portability nests line-**items**.

### T2 — Erasure → hard-delete ✅ (committed `f028c84`)
- `backend/app/services/consent.py`: `anonymize_user_transactions` → **`delete_user_transactions`** — DELETE in explicit FK order (flags → items → images → transactions) by `ownership_scope_id` (personal scope). `anonymize_user_profile` **kept** (scrubs the User shell; the `dsr_erasure` audit event FKs to `user_id`, so the row must survive).
- `backend/app/api/privacy.py`: erasure endpoint uses the new fn; docstring + response/audit field `transactions_anonymized` → **`transactions_deleted`**.
- `backend/app/schemas/consent.py`: `ErasureResponse.transactions_deleted`.
- `backend/tests/test_privacy.py`: flipped to assert genuine deletion (rows gone, User shell scrubbed survives).
- openapi regenerated (web + mobile); `P6-INSIGHTS-CONTRACT.md` erasure line corrected; broader doc sweep deferred → **P67**.
- Verification: ruff + mypy clean; full suite **832 passed / 12 skipped**.

## 4. What remains — with grounding done

### T3 — Tombstone infrastructure
- **New model** `group_stat_tombstone`: `(ownership_scope_id [group scope], period [str, e.g. "2026-01"], reason, created_at)`. One row voids one group-period stat.
- **New migration** `alembic/versions/035_group_stat_tombstone.py`, `down_revision = '034'` (latest is `034_notifications.py`).
- **Stats-layer check**: the group-period node totals are assembled in `backend/app/services/insights/tree.py` (`build_insights_tree_from_records`, `_tree_node`) + `loading.py`. Before returning a group-scoped period stat, check for a tombstone → return the void notice instead of the numbers.
- TDD: a tombstoned `(group, period)` hides that period's group stat with the notice.

### T4 — Wire account-delete → group void
- In `privacy.py` erasure (account-delete is TOTAL): find the user's **group copies** via `Transaction.shared_by_user_id == user_id` (query pattern at `app/api/groups.py:414`). These live in **group scopes** — NOT the personal scope T2 deletes.
- For each `(group scope, period)` the copies touch (period from `transaction_date`): insert a **tombstone** (T3) + **revoke visibility** (D74 — don't mutate the locked copy). Notice: "this member left the application; stats shut down for the affected months."
- TDD: two-user fixture — A shares into a group with B → A account-deletes → A's shared txns invisible to B + the affected group-period stats voided.
- ⚠ T2's `delete_user_transactions` only touches the **personal** scope; the group copies are a separate void handled HERE.

### T5 — Group-leave keep-vs-delete choice
- `POST /{group_id}/leave` **already exists** (`app/api/groups.py:523`) and **already keeps** the shared data (comment at `:458` — "their shared transactions remain in the group's statistics"). That's the "keep" branch (default).
- T5 **adds the "delete" choice**: a param (e.g. `?delete_shared=true`) that triggers the group void (reuse T3/T4's tombstone + revoke, scoped to THIS group only). The user's own account/data is untouched.
- Also consider `DELETE /{group_id}/members/{member_user_id}` (`remove_member`, `:489`) — admin-removal likely defaults to keep.
- TDD: leave+keep → stats unchanged; leave+delete → affected group-period stats voided.

### T6 — Staging runtime proof (REQUIRED — gates Exec=✅)
- `runtime_journey_required` + `staging_proof_required` are true. Localhost/unit tests cannot close this.
- Push `HEAD:staging` → Railway staging-e2e. **Wait for the backend to STABILIZE** (poll for the new behavior, ≥3 consecutive) before FE proofs — the redeploy transiently serves the prior deploy.
- Playwright/API journey: all 4 DSR rights on a **throwaway** test user vs the deployed URL.
- Two-user fixture (shared staging users A+B; creds in gitignored `mobile/.env`): account-delete void + group-leave choice.
- Artifacts → `tests/web-e2e/` + `tests/mobile/results/...`. Staging-e2e URL: `https://gastify-api-staging-e2e-staging.up.railway.app`.

## 5. Constraints + gotchas (carry forward)

- **Never raw `git commit`** — use `/gabe-commit` (CHECK 1–8 gate). **No `Co-Authored-By`** (attribution disabled). The block-no-verify hook allows `git commit -F file`.
- **B2 convention**: web/Android changes need Playwright/Maestro proof on **deployed** staging-e2e before promote (T6).
- **D76**: staging-e2e uses **mock** Gemini; staging + production use the real paid tier. (Not central to Phase 1.)
- **openapi regen**: `npm run generate:api` in **web AND mobile** after any schema/endpoint change, or CI "API Drift" fails.
- **Live-PG harness**: `GASTIFY_TEST_PG_DSN` runs `test_rls_postgres.py` + `test_group_isolation.py` against real PG in CI — use it for the delete/void data-safety paths.
- **Deploy flow**: feature branch → `git push origin HEAD:staging` (staging-e2e + CI) → B2 proofs → promote `git push origin origin/staging:main`.
- Erasure is **irreversible** — verify FK order + that you never delete/void the wrong scope. `auth.ownership_scope_id` is the personal scope (T2 verified this); group copies live in group scopes (T4).

## 6. How to resume

1. `/gabe-execute` → detects Exec=🔄, T1–T2 done, resumes at **T3**.
2. TDD per task; commit each via `/gabe-commit`.
3. **T6** (staging proof) gates Exec=✅.
4. After Phase 1 Exec=✅: `/gabe-review` → `/gabe-push` (staging proof + promote).
5. Then Phase 2 (validate retention/consent — mostly validation, see PLAN).

## 7. Git state

- Branch `feat/phase6-items-reports`, HEAD **`1e9e7e1`**.
- Key commits: `f028c84` (T2 erasure hard-delete), `5798d6f` (D89 + re-scope), `59b72ab` (D82 rev3), `ae21be8` (D88), `dbc4368` (P16 plan + HTML dashboard).
- `main` = `origin/staging` = `82be9ba`. The branch is ahead by the P16 plan + T2 — **nothing promoted**; P16 is unproven until T6.
- HTML readiness dashboard: `docs/gabe/plans/2026-06-07-p16-compliance-launch/index.html`.
