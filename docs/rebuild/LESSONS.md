# LESSONS.md — BoletApp Retrospective for Gastify Rebuild

**Date:** 2026-04-21
**Purpose:** Capture recurring failure patterns from the Firebase/React prototype so the FastAPI+PostgreSQL rebuild does not repeat them. Every rule below is tied to evidence (commits, files, memory entries). Read this alongside `PLAN.md` and `REFERENCE-SNAPSHOT.md`.

**Meta-rule:** a lesson without evidence is speculation. Every rule in §4 cites a specific failure. If the citation becomes irrelevant later, delete the rule — don't carry dead dogma into the rebuild.

---

## 1. State Management Failures (Primary Pain Category)

### 1.1 Dual state machines syncing manually

**Evidence:**
- `src/features/scan/hooks/useScanOverlayState.ts` (~240 LOC) coexists with `useScanStore` Zustand slices. Both track overlay lifecycle.
- Gallery dismiss bug: `handleScanOverlayDismiss` reset local React state but **not** Zustand `phase`. Subsequent `setImages` was blocked because `useScanStore` thought a scan was still active (`memory/MEMORY.md` §Scan Workflow Restructuring).
- Documented as Tier-1 in `docs/architecture/proposals/SCAN-WORKFLOW-RESTRUCTURING-PROPOSAL.md` §1B.

**Root cause:** two sources of truth for the same concept (scan active? yes/no) diverged under user interactions the original design never anticipated.

**Rebuild rule:** one concept → one store. If overlay visibility is derived from scan phase, compute it via selector — don't store it separately. See §4 R1.

---

### 1.2 Cross-feature direct store mutations

**Evidence:**
- `src/features/scan/handlers/processScan/processScan.ts` directly calls `transactionEditorActions.setTransaction(...)`.
- Tight coupling: scan knows editor's internal API.
- When editor re-renders before the store flush completes, stale state renders.
- Documented in proposal §2B.

**Root cause:** feature modules imported each other's action creators. No event bus, no command layer.

**Rebuild rule:** scan completion emits an event (`scanResultReady`). Editor subscribes. Scan never imports editor. See §4 R2.

---

### 1.3 Files that grew unbounded

**Evidence (top offenders as of 2026-04-21):**

| File | LOC | Threshold | Status |
|---|---|---|---|
| `src/features/transaction-editor/views/TransactionEditorViewInternal.tsx` | 1128 | 800 | **OVER LIMIT** (hook blocks edits) |
| `src/features/batch-review/views/BatchCaptureView.tsx` | 798 | 800 | At limit |
| `src/features/batch-review/hooks/useBatchReviewHandlers.ts` | 769 | 800 | Near limit |
| `src/features/scan/hooks/useScanInitiation.ts` | 536 | 500 (soft) | Grew unchecked |
| `src/features/scan/hooks/useScanHandlers.ts` | 558 | 500 (soft) | Grew unchecked |
| `src/types/scanStateMachine.ts` | 528 | 500 (soft) | Misplaced — types outside feature |

**`useScanStore.ts`** was at **946 LOC before being split into 6 slices** (`scanCoreSlice`, `scanBatchSlice`, `scanCreditSlice`, `scanDialogSlice`, `scanUISlice`, `scanPendingSlice`). It is now 48 LOC (composition only) — the split unblocked edits and surfaced real boundaries.

**Root cause:** 800-line hook was the only enforcement. Nothing triggered splitting at 400 or 500 — files grew until they hit the hard wall.

**Rebuild rule:** enforce 500 LOC soft limit via CI warning + 800 LOC hard block. Split at 500 (architectural signal), not at 800 (emergency). See §4 R3.

---

## 2. The Scan→Edit Bug (Case Study)

User report: "when we went to the edit screen, tried to edit the transaction items and got errors."

Three independent seams conspired.

### Seam A — Async result delivery listener race

**Evidence:** `memory/scan-fix-handoff.md` — "Remaining bug: Result delivery chain broken — scan completes server-side but UI never shows result. Root cause area: `usePendingScan` Firestore listener not activating when `queueScanFromImages` sets `pendingScanId`."

**Mechanism:**
1. Client writes `pendingScanId` to Zustand
2. `usePendingScan` hook reads the ID to open a Firestore `onSnapshot` listener
3. Server writes the scan result to Firestore
4. **Timing window:** if the listener hook fires `useEffect` after the server has already written the result, it opens a listener on a document that will not change again — so the UI never receives the "completed" notification

**Fix attempted:** commit `1d219e7d` rewired subscription in `App.tsx:571-631`. `MEMORY.md` still marks the emergency fix as INCOMPLETE as of 2026-03-29. (Verify state at rebuild start.)

---

### Seam B — Direct cross-feature store write

**Evidence:** `processScan.ts` → `transactionEditorActions.setTransaction(...)`.

**Mechanism:** scan completes → directly mutates editor store → editor renders before store propagation → item list renders with stale props → edit action fires against stale data → error.

---

### Seam C — Gemini field name drift

**Evidence:**
- Gemini returns `price` on line items.
- Client/DB expect `totalPrice`.
- Fixed in commit `1094c5b6` with remap inside `processReceiptScan.ts`.
- Compat shim still in `src/repositories/utils.ts` marked `TODO(TD-18-8): Remove after Firestore migration (2026-Q2)`.

**Mechanism:** shim catches old data; new data bypassed shim but contained null `totalPrice` for some edge cases → edit form rendered with `undefined` → state write threw.

---

### Three seams, three rebuild mitigations (see §4)

| Seam | Rebuild mitigation |
|---|---|
| A — listener race | SSE from a single persistent connection opened at app boot; server writes `scan_events` regardless; `GET /scans/{id}` poll-fallback always valid (R5) |
| B — cross-feature write | `scanResultReady` event; editor subscribes; scan never imports editor code (R2) |
| C — field drift | Pydantic `output_type` on Gemini call rejects unknown fields at parse time (U4 value); shared `shared/categories.json`+`shared/constants.json` codegen means TS and Py can't drift (R6) |

---

## 3. Recurring Bug Categories (last 50 commits)

| Category | Fix commits | Most-touched file | Pattern |
|---|---|---|---|
| Scan async pipeline | 8 | `src/App.tsx` (13 fixes) | Listener races, stale pending_scans on login, overlay sync |
| Gemini/JSON coercion | 4 | `functions/src/processReceiptScan.ts` (7 fixes) | Field coercion, null handling, JSON repair, `price→totalPrice` |
| UI/UX state timing | 6 | `useScanHandlers.ts` (8 fixes) | Button disable timing, auto-scan behavior, toast visibility |
| Storage/thumbnail | 3 | image processing utilities | Image lifecycle, deletion timing, portal positioning |
| Cloud Functions deploy | 4 | CI config, `firebase.json` | Peer deps, env config, CI detection |
| Test infrastructure | 3 | smoke scripts | Broken pipe in tee, shell variable expansion |

**Observation:** `src/App.tsx` with 13 fixes is a **god-orchestrator**. It wires `useScanWorkflowOrchestrator` imperatively. Every new feature adds another `useEffect` to it. This is the next file destined for the 800-LOC wall.

---

## 4. Rebuild Rules (indexed for cross-reference)

Each rule cites its evidence and binds to a PLAN.md phase.

### R1 — One store per concept; derived state via selectors

- **Evidence:** §1.1 dual state machine bug
- **Rule:** Overlay visibility, progress %, error display — all derived from scan phase. Never store them separately.
- **Implementation:** Zustand slice + selector helpers. No `useState` for anything reflected in the store.
- **Binds to:** PLAN.md **I2** (component impl) — components read from store via selectors only

---

### R2 — Feature isolation via event bus, not action imports

- **Evidence:** §1.2 scan→editor direct mutation
- **Rule:** Scan completion emits `scanResultReady({ transactionId, items })`. Editor subscribes. Scan has zero imports from editor module. Editor has zero imports from scan module.
- **Implementation:** typed event bus (e.g., `mitt` with TS wrapper) OR Zustand store that holds an event queue which any feature can consume.
- **Binds to:** PLAN.md **I3** (API wiring) — wire SSE → event bus → feature subscribers

---

### R3 — File size limits enforced by CI, not good intentions

- **Evidence:** §1.3 table of bloated files
- **Rule:**
  - 300 LOC soft warning
  - 500 LOC CI warning (must be justified in PR description)
  - 800 LOC pre-commit HARD BLOCK
- **Implementation:** pre-commit hook already exists in current app — port to rebuild unchanged. Add 500 LOC soft warning.
- **Binds to:** PLAN.md **B0** (scaffolding)

---

### R4 — Gemini output validated by schema, not by hand-written coercion

- **Evidence:** §2 Seam C, §3 4 Gemini-related fixes
- **Rule:** Gemini call uses Pydantic `output_type` so malformed responses raise at parse time, not at DB-write time. Fallback chain is deterministic: regex extract → `Other`/`OtherItem` defaults. Never fail to save.
- **Implementation:** Aligned with User Value U4 — `PydanticAI output_type` + deterministic fallback.
- **Binds to:** PLAN.md **B4** (scan pipeline)

---

### R5 — Async result delivery has no "hope the listener attached in time"

- **Evidence:** §2 Seam A listener race; `memory/scan-fix-handoff.md` INCOMPLETE
- **Rule:** Two independent delivery paths:
  1. **Push:** SSE from `/api/v1/scans/stream` — one long-lived connection per app instance, opened at sign-in, holds `LISTEN scan_done_<user_id>` on a persistent Postgres connection
  2. **Pull fallback:** `GET /api/v1/scans/{id}` returns current status regardless of subscription state
- The UI uses SSE as primary; if SSE drops (mobile backgrounding, transient disconnect), the next user action triggers a pull. Result is idempotent — scan_events table makes the full history queryable.
- **Binds to:** PLAN.md **B4** (SSE endpoint) + **I3** (frontend reconnect logic)

---

### R6 — Shared constants + categories code-generated, no hand-sync

- **Evidence:** §2 Seam C field drift; 44+ Tailwind theme variants hand-synced across files
- **Rule:** `shared/categories.json` and `shared/constants.json` are the single source. Codegen emits `shared/categories.py` + `shared/categories.ts` + `shared/constants.py` + `shared/constants.ts`. CI diff-check fails on drift. Pre-commit regenerates automatically.
- **Constants covered:** `EDIT_WINDOW_DAYS`, `MAX_CONCURRENT_SCANS`, `MAX_DAILY_SCANS`, `CREDITS_INITIAL_BALANCE`, `GEMINI_SAFETY_LIMIT`, currency exponents, etc.
- **Binds to:** PLAN.md **B3** (extended) + **B0** (CI pre-commit integration)

---

### R7 — Failure paths documented before happy paths

- **Evidence:** 4 distinct scan refund mechanisms (Gemini fail, user cancel, stale timeout, listener miss) discovered incrementally during Epic 18
- **Rule:** Before B4 implementation starts, write failure-mode matrix in `docs/rebuild/FAILURE-MODES.md`:
  - What can fail
  - How we detect it
  - What we tell the user
  - How we recover credits/state
- Without this doc, B4 cannot be reviewed-to-merge.
- **Binds to:** PLAN.md **B4** (blocker artifact before coding)

---

### R8 — Fixture-based determinism for Gemini from day 1

- **Evidence:** Plan B implemented mid-epic (commits `c0d53d9e`, `0c4e5fb0`); would have saved weeks if designed in
- **Rule:** `tests/fixtures/gemini/` cached responses keyed by SHA-256 of input. `PYTEST_GEMINI=live` mode updates cache; default mode replays. Every new test fixture requires review.
- **Implementation:** Already specified in PLAN.md **B11**. Reinforcing its importance here.
- **Binds to:** PLAN.md **B11**

---

### R9 — Explicit async phase model, not combined progress %

- **Evidence:** 6 UI-timing fixes (`b08ed985`, `f903b294`, etc.); "instant button disable + suppress small discrepancy toast" patch pattern
- **Rule:** Phases are discrete enum values: `idle → uploading → queued → processing → extracting → saving → done | failed`. UI maps each phase to a specific affordance. No "progress percentage" concept — it lies about real state.
- **Implementation:** `scan_events` event types double as phase labels. Frontend Zustand store holds current phase, not a number.
- **Binds to:** PLAN.md **I2** (scan progress narrative component)

---

### R10 — Orchestration is its own module, not imperative `App.tsx` wiring

- **Evidence:** `src/App.tsx` has 13 fix commits; grew to 630+ LOC; future 800-LOC wall target
- **Rule:** Cross-feature coordination lives in `apps/web/src/orchestration/` with named orchestrator functions (e.g., `scanToEditorOrchestrator`, `creditLifecycleOrchestrator`). `App.tsx` stays a thin router + provider mount.
- **Binds to:** PLAN.md **I1** (scaffold) + **I3** (wiring)

---

### R11 — Centralize external model/service config

- **Evidence:** Gemini model string appeared in 3 files (`processReceiptScan`, `analyzeStatement`, `analyzeReceipt`); drift caused incidents
- **Rule:** `apps/api/config/ai_models.py` exposes `GEMINI_MODEL_FOR_RECEIPTS`, `GEMINI_MODEL_FOR_STATEMENTS`, `GEMINI_TIMEOUT_MS`, etc. Every call site imports. No inline string literals.
- **Binds to:** PLAN.md **B4**

---

### R12 — Compat shims expire; data migrates upfront

- **Evidence:** `(i as any).price` fallback in 2 files marked `TODO(TD-18-8)` for Q2 2026
- **Rule:** Postgres cutover migrates data to canonical shape during B13 — no `as any` fallback code on the API side. If a field needs renaming, rename it in the migration script, not at read time.
- **Binds to:** PLAN.md **B13**

---

### R13 — Debug tools decide patch strategy

- **Evidence:** `MEMORY.md` §Scan Pipeline Emergency Fixes — "Don't blind-patch via remote control — need browser devtools to debug React state/listener issues"
- **Rule:** Timing/listener bugs require live browser inspection. No blind patches against cloud/staging without local repro.
- **Implementation:** B0 includes docker-compose that spins up Postgres + API + worker locally; worker can be attached to Python debugger; SSE inspected via Chrome DevTools `EventSource` panel.
- **Binds to:** PLAN.md **B0** (local dev ergonomics as first-class B0 deliverable)

---

## 5. PLAN.md Phase Cross-Reference

| Rule | PLAN Phase(s) | Acceptance criterion the rule adds |
|---|---|---|
| R1 one store per concept | I2 | No `useState` mirrors store fields — grep check in CI |
| R2 event bus | I3 | Zero imports from `features/editor/*` inside `features/scan/*` and vice versa — dep-cruiser rule |
| R3 file limits | B0 | Pre-commit hook installed; CI warning at 500 LOC |
| R4 Pydantic output_type | B4 | Integration test: malformed JSON → parse error, not DB error |
| R5 SSE + pull fallback | B4, I3 | E2E test: disable SSE → next user action pulls status |
| R6 codegen constants | B0, B3 | CI diff-check fails if `.py` or `.ts` constants edited directly |
| R7 failure-mode matrix | B4 | `FAILURE-MODES.md` exists and is reviewed before B4 code merge |
| R8 fixture determinism | B11 | `pytest` default mode has zero live Gemini calls |
| R9 discrete phase enum | I2 | Narrative component tests assert phase label per state |
| R10 orchestrator module | I1, I3 | `apps/web/src/App.tsx` ≤ 150 LOC |
| R11 centralized model config | B4 | `ai_models.py` is the only file importing Gemini model names |
| R12 migrate, don't shim | B13 | No `as any` or `Optional` type widening on read path |
| R13 local debug parity | B0 | `docker compose up` gives working local stack < 2 min |

---

## 6. Watchlist for Rebuild Reviewers

During I2/I3 code review, every PR that touches frontend state or scan pipeline gets this checklist:

- [ ] Does any component mirror a store field in local `useState`? (R1)
- [ ] Does any feature module import from another feature module's internals? (R2)
- [ ] Did this PR push any file past 500 LOC without justification? (R3)
- [ ] Are all Gemini response fields declared in the Pydantic output model? (R4)
- [ ] Does SSE failure degrade to pull fallback, or silently hang? (R5)
- [ ] Were new categories/constants added to `shared/*.json` or hand-coded elsewhere? (R6)
- [ ] Is every new failure mode represented in `FAILURE-MODES.md`? (R7)
- [ ] Does this PR add a live Gemini call to any default-mode test? (R8)
- [ ] Does the UI reflect discrete phases, or roll up into a single progress bar? (R9)
- [ ] Is cross-feature wiring done in orchestration layer, or inline in `App.tsx`? (R10)
- [ ] Are model IDs hard-coded, or imported from `ai_models.py`? (R11)
- [ ] Does the migration handle this field transformation, or is there a shim? (R12)
- [ ] Can this bug be reproduced locally, or only on cloud? (R13)

This checklist lives in the PR template (`.github/pull_request_template.md`) in the rebuild repo from day 1.

---

## 7. Explicit Non-Lessons (things that worked — preserve)

Not every pattern in the current app is a failure. These decisions proved correct and should carry forward:

- **Feature-Sliced Design** — `src/features/*/` organization survived multiple refactors (Epic 15, 15b). Replicate.
- **Firebase Auth (Google OAuth)** — zero auth-related incidents. Preserve as-is (prompt §Auth decision).
- **Pre-computed period keys** (day/week/month/quarter/year generated columns) — analytics stays fast. Preserve in Postgres schema.
- **1 credit per scan + atomic refund on failure** — credit reconciliation is tight. Replicate the pattern with Postgres transactions.
- **Spanish-first i18n** — user-facing strings live in one file (`src/utils/translations.ts`). Preserve location, convert format.
- **Hooks-before-code pattern** — pre-commit + PostToolUse hooks blocked bad patterns mechanically. Port hook config to rebuild repo.
- **V4 taxonomy (12+44+9+42)** — clean 4-level hierarchy works. Preserve EXACTLY (prompt mandate).

---

## 8. Sources

- `docs/architecture/proposals/SCAN-WORKFLOW-RESTRUCTURING-PROPOSAL.md` — canonical state pain analysis
- `memory/MEMORY.md` §Scan Pipeline Emergency Fixes, §Scan Workflow Restructuring
- `memory/scan-fix-handoff.md` — result delivery bug investigation notes
- Commits: `1d219e7d`, `1094c5b6`, `c0d53d9e`, `0c4e5fb0`, `b08ed985`, `f903b294`, `a162f6b8`, `a5ae0966`
- Snapshot SHA: `6842cf302f3a97000c901e5d88cd9010064f3f2f` (see `REFERENCE-SNAPSHOT.md`)
