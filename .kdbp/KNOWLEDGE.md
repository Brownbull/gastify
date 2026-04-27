# Human Knowledge Map

<!-- Tracks what the human (operator/architect) understands about decisions made. -->
<!-- Populated and updated by /gabe-teach. -->
<!-- Goal: the human knows WHY/WHEN/WHERE, not HOW. Architect-level, not coder-level. -->

## Root artifacts

- [`.kdbp/SCOPE.md`](SCOPE.md) — project premise v1 (2026-04-22). Changed via `/gabe-scope-change` only.
- [`.kdbp/ROADMAP.md`](ROADMAP.md) — phase plan v1 (2026-04-22), derived from SCOPE. Updated on `/gabe-scope-change` or phase completion.
- [`.kdbp/scope-references.yaml`](scope-references.yaml) — Reference Frame + conflict/override audit trail (3 overrides recorded this session).
- [`.kdbp/research/archive/20260422T223746Z/`](research/archive/20260422T223746Z/) — archived scope-authoring research (domain, pitfalls, SUMMARY).
- [`.kdbp/archive/tombstones/scope-session-20260422T223746Z.json`](archive/tombstones/scope-session-20260422T223746Z.json) — scope-authoring session tombstone.

## Gravity Wells

<!-- Architectural sections of the app. Topics anchor to a primary well. -->
<!-- Soft cap: 7 wells (Miller's number). -->
<!-- A topic that spans wells gets one primary Well + `cross` in the Tags column. -->
<!-- G0 Uncategorized is a reserved fallback for orphan topics; /gabe-teach flags it. -->

<!-- Analogy column: one-liner (5-15 words) from gabe-lens. Makes each well graspable at a glance. -->
<!-- Paths column: comma-separated globs where this well's code lives (e.g., `app/api/**, tests/api/**`). Used by brief mode for health/last-commit signals. -->
<!-- Docs column: single path to this well's docs file (e.g., `docs/wells/3-api.md`). Empty = opt-out (no docs tracked for this well). Used by brief mode to surface doc links, by /gabe-teach topics to auto-append verified summaries, by /gabe-commit CHECK 7 Layer 3 for drift detection. -->
<!-- All three columns generated at init-wells time; regenerable via /gabe-teach wells. -->

| # | Name | Description | Analogy | Paths | Docs | Topics (verified / pending / total) |
|---|------|-------------|---------|-------|------|--------------------------------------|
| G1 | API Core | FastAPI entry + config + DB session + routes + observability. The stage. | "Building's front lobby — routes in, plumbing for everyone, lights always on." | `api/main.py`, `api/config.py`, `api/database.py`, `api/types.py`, `api/routes/**`, `api/observability/**`, `tests/api/test_main.py`, `tests/api/routes/**` | `docs/wells/1-api-core.md` | 0 / 0 / 0 |
| G2 | Data Model | SQLAlchemy ORM + Pydantic schemas + Alembic migrations. Money/FX/ownership schema invariants. | "Warehouse shelves and labels — everything kept, named, findable." | `api/models/**`, `api/schemas/**`, `alembic/**`, `tests/api/models/**`, `tests/api/schemas/**` | `docs/wells/2-data-model.md` | 0 / 0 / 0 |
| G3 | Identity + Ownership | Firebase auth + JIT provisioning + `ownership_scope` + consent/processing register (4-jurisdiction). | "Badge-reader at every door — who you are, what you can touch." | `api/services/auth*`, `api/services/consent*`, `api/services/scope*`, `tests/api/services/test_auth*`, `tests/api/services/test_consent*` | `docs/wells/3-identity-ownership.md` | 0 / 0 / 0 |
| G4 | Scan Pipeline | Vision LLM (Gemini) → guardrails → two-stage extraction → V4 categorizer → math-reconciliation gate → streaming. Core differentiator. | "Receipt translator — photo in, line-items out, hallucinations caught at gate." | `api/agents/**`, `api/guardrails/**`, `api/services/scan*`, `api/services/categor*`, `tests/api/agents/**`, `tests/api/guardrails/**` | `docs/wells/4-scan-pipeline.md` | 0 / 0 / 0 |
| G5 | Integrations | External adapters — Firebase, Gemini, FX feed, PDF statement parser. Every outside service behind one doorway. | "Diplomatic embassies — each outside service, exactly one doorway we control." | `api/integrations/**`, `tests/api/integrations/**` | `docs/wells/5-integrations.md` | 0 / 0 / 0 |
| G6 | Web Portal | React + Vite + Zustand + TanStack Query + Ladle. Responsive SPA. | "Shopfront window — desktop or phone browser, same storefront." | `web/**`, `tests/web/**` | `docs/wells/6-web-portal.md` | 0 / 0 / 0 |
| G7 | Mobile App | React Native + Expo + EAS + Detox + Jest. Android + iOS single codebase. Native camera, bidirectional streaming, keystore. | "Pocket version — native camera, offline-tolerant, same shared backend." | `mobile/**`, `tests/mobile/**` | `docs/wells/7-mobile-app.md` | 0 / 0 / 0 |

## Topic Classes

| Class | Question it answers | Source |
|-------|--------------------|--------|
| **WHY** | Why did we choose this approach? | commits, PLAN.md, DECISIONS.md |
| **WHEN** | When to apply / not apply this pattern? | repeated patterns across commits |
| **WHERE** | Why does this file live here? (static gravity well) | new files + project structure conventions |

## Status Lifecycle

| Status | Meaning | Re-surfaces? |
|--------|---------|--------------|
| `pending` | Detected from changes, not yet discussed | Yes, next /gabe-teach |
| `verified` | Human answered quiz correctly (score recorded) | No, unless stale |
| `skipped` | Human deferred this session | Yes, next /gabe-teach |
| `already-known` | Human claimed prior knowledge | No |
| `stale` | Verified >90 days ago | Yes, for refresh |

## Topics

<!-- ArchConcepts column: comma-separated architecture concept IDs from the gabe-arch skill -->
<!-- (e.g., "retry-with-exponential-backoff, idempotency-keys"). Empty = no tags. -->
<!-- Populated by /gabe-teach Step 4b.5 (deterministic match + LLM fallback + human confirm). -->
<!-- Cross-project concept verification lives in ~/.claude/gabe-arch/STATE.md. -->

| # | Well | Class | Topic | Status | Tags | ArchConcepts | Last Touched | Verified Date | Score | Source |
|---|------|-------|-------|--------|------|--------------|--------------|---------------|-------|--------|

## Sessions

<!-- Append-only log of /gabe-teach runs. Enriched with wells active + plan/phase reference. -->

## Storyline

<!-- Generated on demand by /gabe-teach story. Lossy analogy of what's been built and why. -->
<!-- Auto-refresh trigger: 3 new archived plans since last generation. Manual: /gabe-teach story refresh. -->

No storyline generated yet. Run `/gabe-teach story` after a few completed phases to generate one.

---

## Verified Architectural Findings

<!-- Long-form architectural analyses that don't fit the Topics-table row format. -->
<!-- Each entry is dated, cites file:line evidence, and is durable across sessions. -->
<!-- Future Claude sessions: consult these before editing the relevant code paths. -->

### 2026-04-27 — Architectural Fragility: dual-ledger drift in the BoletApp port (Well G6)

**Status:** Verified. Six instances confirmed (1 observed + 5 siblings). Pattern is dominant in the frontend codebase, not isolated.

**Source:** Originally drafted as planning artifact; copied here as the durable home. Plan file at `~/.claude/plans/at-this-stage-maybe-sunny-wall.md` retains the same content for reference.

**Strategic relevance:** Informs the open question of whether to reuse the legacy frontend port or rebuild. **This finding does not make the decision; it documents the architectural cost of carrying the existing pattern forward.**

#### Trigger symptom

While auditing the mock build, scanning a receipt and pressing "Guardar ahora" causes the user's credit count to go **up by 1** instead of down by 1. The transaction persists correctly. Two console messages from `[ScanStore:guard]`:

1. `action: 'resolveDialog', currentPhase: 'reviewing', detail: "dialog type mismatch: expected 'scan_complete', active is 'none'"`
2. `action: 'reset', currentPhase: 'reviewing', detail: "credit safety net: refunding unredeemed credit (status was 'confirmed')"`

Initial diagnosis ("saveSuccess didn't fire on the quick-save path") is correct as far as it goes — but understates the issue. **It is a class of latent bugs sharing the same architectural shape, not one missed transition.**

#### The architecture underneath

**Dual-ledger design.** Credits are tracked in two ledgers:

| Ledger | Type | Location | Role |
|---|---|---|---|
| Persistent | Firestore document | `artifacts/{appId}/users/{userId}/credits/balance` | Source of truth for the bottom-nav display |
| Local UI state | Zustand slice field | `creditStatus`, `creditsCount`, `creditType` in `scanCreditSlice.ts` | UI lifecycle hint |

The two ledgers are loosely coupled. **No enforced reconciliation, no transaction wrapping both, no single-writer contract.**

**Who actually writes to credits:**

| Operation | Writes Firestore? | Writes Zustand `creditStatus`? |
|---|---|---|
| `processStart` (scan begins) | ❌ no | ✅ → `'reserved'` |
| `processSuccess` (Gemini returns) | ❌ no | ✅ → `'confirmed'` |
| `processError` | ❌ no | ✅ → `'refunded'` |
| User cancels mid-scan | ✅ via `_creditRefundCallback` → `addAndSaveCredits(1)` | ✅ → `'refunded'` |
| `reset()` (cleanup) | ✅ same callback IF `creditStatus` was `'reserved'`/`'confirmed'` | ✅ → `'none'` |
| `saveSuccess` (transaction saved) | ❌ no | ✅ → reset to `'none'` |
| **Real backend** `queueReceiptScan` (production) | ✅ deducts via Cloud Function | ❌ no |
| **Mock backend** `queueReceiptScan` (this build) | ❌ **no** | ❌ no |

The crucial reads:

- In **production**, the Cloud Function deducts the credit at scan-start. The local `creditStatus` is just a UI hint mirroring server intent.
- In the **mock**, the deduction never happens. The local `creditStatus` is the *only* signal that exists.
- In **both**, the only Firestore write to the credits doc that the *frontend* ever issues is the **refund callback** (`addAndSaveCredits(1)` at `services/userCreditsService.ts:257`).

So in the mock build, the credits doc never decrements; it only ever increments via refunds. That's why the visible quirk is +1 (no deduction happened, then a refund added one).

#### The "safety net" — `_refundIfOutstanding`

At `frontend/src/features/scan/store/slices/scanCoreSlice.ts:49-70`:

```typescript
function _refundIfOutstanding(get, actionName) {
  const state = get();
  if (state.creditStatus === 'reserved' || state.creditStatus === 'confirmed') {
    logGuardViolation({ ... });
    if (_creditRefundCallback) _creditRefundCallback(1).catch(...);
  }
}
```

Fires from `cancel()` (line 285) and `reset()` (line 292). **Deliberately omitted** from `saveSuccess()` (line 261, comment `TD-18-3: No _refundIfOutstanding here — credit was legitimately spent`).

**Assumption baked into this design:** any code path that ends a scan must either go through `saveSuccess()` (which clears the credit cleanly) OR through `cancel()`/`reset()` (which the safety net catches). No third path is allowed.

That assumption is violated in this codebase, in three ways for the credit case alone and in five other places (sibling patterns below).

#### Three classes of phantom refund — credit case

**Class A: Save completes via a non-`saveSuccess` path**
- Where: `frontend/src/hooks/app/useTransactionHandlers.ts:348` — `txRepo.add(tDoc)` writes the transaction directly to Firestore.
- What's missing: No call to `scanActions.saveStart()` before, no call to `scanActions.saveSuccess()` after.
- Result: `creditStatus` remains `'confirmed'` indefinitely. Whenever `reset()` next fires, the safety net refunds. **This is the bug we observed.**

**Class B: Cancel/retry/dismiss after a completed scan**
- Where: `frontend/src/features/scan/hooks/useScanHandlers.ts:212, 226, 240` — three handlers that call `useScanStore.getState().reset()`.
- What's missing: No check whether the scan had already produced a saved transaction.
- Result: If the scan succeeded but the user dismisses the overlay before saving, they get a refund (legitimate). If it succeeded *and saved* via Class A's path, they get a **second** phantom refund.

**Class C: Restored interrupted state**
- Where: `frontend/src/features/scan/store/slices/scanCoreSlice.ts:382-389` — `restoreState()` action.
- What's missing: When the persisted state has `phase: 'scanning'`, the action *directly* sets `phase: 'error', creditStatus: 'refunded'` in the new state object — but does **not** call `_creditRefundCallback`.
- Result: If the user actually had paid for the scan server-side (real backend), the local state shows `'refunded'` while Firestore is untouched. **Inverse asymmetry of Class A.**

#### State machine — vocabulary gaps

```
ScanPhase:    idle → capturing → scanning → reviewing → saving → idle (via saveSuccess)
                                                              ↘ error  (via processError, restoreState)
                                                              ↘ idle   (via cancel, reset)

CreditStatus: none → reserved (processStart) → confirmed (processSuccess|batchComplete) → ???
                                                                                       ↘ refunded
```

| Phase × CreditStatus | Reachable? | Notes |
|---|---|---|
| `idle, none` | ✅ initial / post-saveSuccess | |
| `capturing, none` | ✅ adding images | |
| `scanning, reserved` | ✅ Gemini call in flight | |
| `reviewing, confirmed` | ✅ scan returned successfully | **The trap state — see Class A/B/C** |
| `saving, confirmed` | ✅ transition during save | Only if `saveStart` is actually called |
| `error, refunded` | ✅ scan failed | |
| `error, confirmed` | unreachable in code | |
| `reviewing, refunded` | unreachable | |

**Missing vocabulary:** the CreditStatus enum is `'none' | 'reserved' | 'confirmed' | 'refunded'`. There is **no `'spent'`**. The implied design assumption — *"saveSuccess is the unique completion path"* — silently breaks the moment any sibling path commits without calling `saveSuccess()`. ScanPhase has the parallel gap: no `'saved'` terminal phase.

**The safety net pattern itself is the smell.** A finally-block-style cleanup is appropriate for genuinely exceptional exits (force-close, browser crash). The problem here is that it's wired into the normal control flow (`cancel`, `reset`) and *guesses* whether to refund based on local state. When it guesses wrong, it silently corrupts the persistent ledger.

#### Five sibling fragility patterns — same shape

| # | Pattern | Location | Severity | Drift mechanism |
|---|---|---|---|---|
| 1 | **Batch-mode credit** | `scanBatchSlice.ts:90-95` | High | `batchComplete()` sets `creditStatus: 'confirmed'`; no `batchSaveStart`/`batchSaveSuccess` exists. Every batch save bypasses the lifecycle the same way Class A does for single scans. |
| 2 | **Pending scan orphans** | `usePendingScan.ts:98-110` | Medium | `creditDeducted: true` written to `pending_scans/{scanId}` but no cleanup if user navigates mid-processing. App.tsx attempts deletion but races with re-entry. Guard at line 107 detects, doesn't reconcile. |
| 3 | **Dialog type mismatch** | `scanDialogSlice.ts:46-56` | Low-Medium | `resolveDialog(type)` checks if active dialog matches, logs guard violation if not, then **silently dismisses anyway**. Conceals upstream race conditions. |
| 4 | **Item-name mappings cache** | `useItemNameMappings.ts:117-120` | Medium | React Query cache + Firestore subscription, no synchronous invalidation on `deleteMapping()`. UI can apply a "deleted" mapping for up to cache TTL → orphaned references in saved transactions. |
| 5 | **Transaction editor fire-and-forget** | `useTransactionHandlers.ts:348-376` | High | `txRepo.add()` succeeds, then image-copy and insight-generation are fire-and-forget. Failures are logged but never trigger rollback. Sets up Class A again on next reset. |

**Frequency: 6 instances total** (1 observed + 5 siblings). All same shape. **This is the dominant pattern in the codebase, not an outlier.**

#### Root cause — why this keeps recurring

The codebase uses **dual-state mirroring** as a default architecture. Every important piece of state lives in *both* a Zustand store *and* a Firestore document, with React Query caches between them.

Three properties combine to produce the bug class:

1. **No single-writer contract.** Any handler can write to either ledger directly.
2. **Defensive cleanup that mutates real state.** When the safety net guesses wrong, it doesn't surface an error — it silently writes to Firestore.
3. **Vocabulary that bakes in assumptions.** The CreditStatus enum has no `'spent'`. The "saveSuccess is the only completion path" assumption is encoded structurally, and silently breaks when violated.

The original BoletApp likely worked acceptably because the real backend's Cloud Functions enforced server-side invariants that masked client-side drift. The mock build strips that enforcement away and the client-side architecture is now the only line of defense — and it leaks.

#### Implications for reuse vs rebuild

**This document does not make the decision; it informs it.**

**If we reuse this frontend.** Minimum-viable architectural fix:
1. Add a `'spent'` terminal value to `CreditStatus`. Set by `saveSuccess` *and* by every other commit path (Class A's `txRepo.add` site, batch save, etc.).
2. Make the safety net refund **only** on `'reserved'` → never on `'confirmed'`. Confirmed credits without `'spent'` indicate a bug; log loudly, don't silently mutate.
3. Audit every site that calls `txRepo.add` from a scan context and require it to call `scanActions.saveStart` + `saveSuccess`.
4. Apply the same shape fix to the five siblings: each needs a terminal-state vocabulary upgrade and a single-writer rule for its dual-ledger.

**Realistic scope:** ~80-150 LOC across ~6 files, plus tests, plus regression sweep against the legacy E2E suite (which we don't currently run). **Not a 1-line fix.**

**If we rebuild.** The constraint that avoids this entire bug class: **single source of truth on the server.** The client should not maintain its own ledger; it should optimistically reflect server intent and reconcile on response. Concretely:

- Credit balance is a server-derived value. Client never writes to it; server emits authoritative state via subscriptions.
- Lifecycle phases (`scanning`, `reviewing`, `saving`) are local UI state only — they have no parallel server state, so they cannot drift.
- "Did the user pay for this scan?" is answered by server records (e.g., a `scan_session` doc owned by a Cloud Function), never by client guesses.

A rebuild starting from this constraint would never have this bug class because there'd be no second ledger to drift against.

**Decision criteria.**
- **Reuse** if: BoletApp source is a trusted basis, fixing 6 sibling bugs is acceptable scope, team has bandwidth for the audit.
- **Rebuild** if: backend rewrite is already happening (it is — gastify is on FastAPI/Postgres, not Firebase), the dual-ledger pattern is incompatible with the new backend's authoritative-state model, and the cost of porting the legacy bug surface is higher than rebuilding with a single-writer contract.

The current FastAPI/Postgres backend can enforce server-authoritative state cleanly. Whether to take that win and rebuild the frontend, or carry the legacy frontend's dual-ledger pattern forward, is the actual decision — not "is the credit bug fixable?".

#### Reproduction (manual, ~3 min)

1. `cd frontend && npm run dev`
2. Open `localhost:5174`, observe bottom-nav credits (e.g., 1200)
3. Tap Escanear → pick "Camino feliz" → tap the receipt thumbnail to trigger Gemini mock
4. In the "¡Escaneo completo!" dialog, tap "Guardar ahora"
5. Observe: credits become 1201 (bug present), 1199 (fixed), or 1200 (mock-aware deduction added)
6. Console: search for `safety net: refunding`. Presence on the success path = bug present.

#### Regression coverage we'd want before declaring "fixed"
- Single scan → save (Class A)
- Single scan → cancel (Class B legitimate refund)
- Single scan → save → cancel of a fresh scan (Class B phantom)
- Batch scan → save → reset (sibling 1)
- Page reload during scan (Class C / sibling 2)
- Mapping delete → apply transaction with that mapping (sibling 4)

None are currently in the test suite. Whichever direction we choose, **add these as the regression baseline first** — otherwise we will rediscover the same shape on the next refactor.

#### References — file:line citations

Core mechanism:
- `frontend/src/features/scan/store/slices/scanCoreSlice.ts:49-70` — `_refundIfOutstanding`
- `frontend/src/features/scan/store/slices/scanCoreSlice.ts:201-221` — `processStart`, `processSuccess`, `processError`
- `frontend/src/features/scan/store/slices/scanCoreSlice.ts:259-264` — `saveSuccess` (omits safety net deliberately)
- `frontend/src/features/scan/store/slices/scanCoreSlice.ts:284-295` — `cancel`, `reset` (call safety net)
- `frontend/src/features/scan/store/slices/scanCoreSlice.ts:382-389` — `restoreState` asymmetry (Class C)
- `frontend/src/features/scan/store/slices/scanCreditSlice.ts:20-29` — credit slice & `refundCredit` action
- `frontend/src/features/scan/store/slices/scanDialogSlice.ts:46-56` — `resolveDialog` silent dismiss

Bypass sites:
- `frontend/src/hooks/app/useTransactionHandlers.ts:348` — `txRepo.add` without saveStart/Success (Class A, sibling 5)
- `frontend/src/features/scan/hooks/useScanHandlers.ts:212, 226, 240` — overlay handlers calling `reset` (Class B)
- `frontend/src/features/scan/store/slices/scanBatchSlice.ts:90-95` — `batchComplete` without batchSaveStart/Success (sibling 1)
- `frontend/src/features/scan/hooks/usePendingScan.ts:98-110` — pending scan guards (sibling 2)
- `frontend/src/hooks/useItemNameMappings.ts:117-120` — mapping cache + subscription drift (sibling 4)

Persistent ledger:
- `frontend/src/services/userCreditsService.ts:47, 79, 147-314` — Firestore credits doc reads/writes
- `frontend/src/services/userCreditsService.ts:257` — `addAndSaveCredits` — the one and only path the frontend writes the credits doc, and it always increments
- `frontend/src/__firebase-mocks__/seed/credits.json` — initial balance shape

Mock divergence:
- `frontend/src/__firebase-mocks__/gemini-mock.ts:127-173` — `queueReceiptScan` mock handler does not deduct
- `frontend/src/__firebase-mocks__/gemini-mock.ts:160` — `creditDeducted: true` written but never reconciled

Test fixtures (design contract clues):
- `frontend/src/features/scan/store/__tests__/useScanStore.credit.test.ts` — covers safety-net behavior; absence of a "txRepo.add bypass" test is itself evidence

---

### 2026-04-27 — Verified UX Findings: scan-flow dialog gaps (Well G6)

**Status:** Verified by hands-on browser testing of the expanded scan-case picker (8 outcomes, see `frontend/src/__firebase-mocks__/scan-case-picker.ts`). Six distinct UX findings worth carrying into the rebuild. Strategic context: gastify will rebuild the frontend from scratch, so these findings are **requirements for the rebuild**, not bugs to fix in the legacy port.

**Verification artifacts:** `docs/scan-pipeline-port/screenshots/2026-04-27-picker-8-cases/`

#### F1. Error dialog ignores `error.message` — all error variants render identically

The legacy error dialog (component renders title `scanError` via i18n key + hardcoded generic body text "Ocurrió un error inesperado") **does not consume the thrown `Error.message`**. Throwing different Firebase-callable error codes produces correctly-differentiated console logs, but the dialog body is identical:

| Outcome | thrown `error.code` | thrown `error.message` (visible in console) | dialog body shown to user |
|---|---|---|---|
| `error` | `internal` | "Mock scan failed: simulated Gemini error" | generic "Ocurrió un error inesperado" |
| `error-no-credits` | `failed-precondition` | "No tienes créditos suficientes para escanear..." | **same** generic body |
| `error-rate-limit` | `resource-exhausted` | "Demasiadas solicitudes. Espera un momento..." | **same** generic body |

`services/gemini.ts:77-101, 142-167` already differentiates by code and re-throws with appropriate messages — but the upstream dialog component reads from i18n, not from the error. Net effect: real users in production see "something went wrong" regardless of *what* went wrong (no credits → suggest buy more; rate limited → suggest wait; generic → suggest retry).

**Rebuild requirement:** error dialogs must surface the differentiated reason and CTA. At minimum, three distinct error UX states per the table above. Best: typed error class hierarchy (`InsufficientCreditsError`, `RateLimitError`, `ScanFailureError`) where the UI dispatches on type rather than parsing strings.

#### F2. Bonus: two previously-dead dialog components are reachable

While verifying the new picker outcomes, two dialog types fired that were previously unreachable from any code path:

- **`cancel_warning`** dialog: "¿Cancelar escaneo? Ya usaste 1 crédito en este escaneo" with "Volver" / "Cancelar de todos modos". Triggers on bottom-nav navigation while a scan is in `'reviewing'` phase with credit `'confirmed'`.
- **`discard_warning`** dialog: "¿Descartar cambios? Tienes cambios sin guardar." with "Volver" / "Confirmar". Triggers when closing the editor with unsaved edits.

Both have full component implementations under `frontend/src/features/scan/components/`. The audit prior to this work claimed they were unreachable because no fixture path triggered them — but the new picker's broader coverage made them naturally hit during regression testing.

**Rebuild requirement:** retain both confirmation patterns. They prevent meaningful data-loss UX. Specifically the `cancel_warning` is critical because it informs the user that a credit was consumed even if they haven't saved yet — that's a transparency contract worth keeping.

#### F3. Currency-mismatch "Use default" path produces incorrect amounts

Already covered in the dual-ledger entry above. Concrete observation from this session: scanning a USD receipt with the "Otra moneda" outcome and choosing "Usar mi moneda (CLP)" *overwrites the currency code* in the transaction doc but **does not convert the amount**. A $48.50 USD receipt becomes a 48 CLP transaction (cents stripping for currency without decimals). This is data corruption, not just imprecision.

**Rebuild requirement:** any "convert currency on save" flow must perform the FX conversion server-side (single source of truth) and store both original and converted amounts. Or remove the choice entirely and force users to either save in detected currency or cancel.

#### F4. `unknown-merchant` UX has no "first time at this place" affordance

When scanning the test fixture `unknown-merchant.json` ("Almacén Don Hugo" — a name that doesn't match any seeded merchant mapping), the standard `ScanCompleteModal` renders **identically** to scanning a known merchant like Jumbo. No banner, no "Categorize this new merchant?" prompt, no "Save mapping for next time?" affordance. The rename-mapping flow (which we *do* want to keep per user direction) is buried behind manual editor interaction.

**Rebuild requirement:** when the merchant is new (no historical scans for this user), surface a one-time "First scan at this merchant" UX with the option to set/confirm category and merchant rename in-flow, before saving. This is the user's stated intent: "we can save merchants to change the name of the merchants in the future; that's okay."

#### F5. Low-confidence scans show literal placeholder strings, no confidence badge

The `low-confidence-coerced.json` fixture has `confidence: 0.31` and merchant `"Unknown"` (literal). In the editor:
- Merchant displays as the literal English word "Unknown" — i18n layer has no translation for this fallback.
- Category falls back to "Otro" with the generic 📦 icon — but this is also what `OtherItem` shows for legitimately-unknown items. No visual distinction between "we couldn't read this" and "user chose Other category".
- **Confidence is never surfaced visually**. A 31% confidence scan looks the same as a 97% confidence scan in the post-scan UI.

**Rebuild requirement:** treat low confidence as a first-class UX state. Distinct visual treatment (banner / icon / colored border on the card / explicit "we're not sure about these fields, please review"). Translate placeholder strings ("Unknown" → "Sin nombre" or "No detectado") via i18n.

#### F6. Untranslated i18n keys leak through to the UI

The error dialog rendered `scanError` as its title — the literal i18n key, not a translated phrase. This means the Spanish translation table is missing entries for at least some scan-flow states. Other potentially-missing keys observed during testing:
- `currencyMismatchTitle`, `useDetectedCurrency`, `useMyDefaultCurrency` — these *did* render translations, so they exist
- `scanError` — leaked through, suggesting the error variant of the scan flow has incomplete translation coverage

**Rebuild requirement:** establish a translation-coverage check in CI. Any i18n key referenced from scan/transaction-editor code must have entries in all supported languages, or build fails. The legacy app has no such gate, which is why these slip through.

#### Cross-cutting note

Findings F1, F4, F5, F6 share a root cause: **the legacy app treats success and exception paths inconsistently**. Success paths get rich, varied UX (different icons per category, item-level breakdowns, confidence-weighted routing). Exception paths collapse to generic "something went wrong" or fall back to placeholder text. The rebuild should design the exception UX with the same rigor as the happy path — every error code and every coercion fallback deserves a designed surface, not a fall-through.

#### References — file:line citations

- Picker: `frontend/src/__firebase-mocks__/scan-case-picker.ts:26-89` — 8 cases array
- Outcome map: `frontend/src/__firebase-mocks__/gemini-mock.ts:50-88` — `OUTCOME_FIXTURE_MAP`, `ERROR_OUTCOMES`
- Error code differentiation in client: `frontend/src/services/gemini.ts:77-101, 142-167`
- Currency mismatch trigger: `frontend/src/features/scan/handlers/processScan/subhandlers.ts:341-373`
- Dialogs: `frontend/src/features/scan/components/{CurrencyMismatchDialog,ScanCompleteModal,TotalMismatchDialog}.tsx`
- New fixtures: `frontend/src/__firebase-mocks__/seed/scan-responses/{usd-target-store,unknown-merchant,low-confidence-coerced}.json`
- Verification screenshots: `docs/scan-pipeline-port/screenshots/2026-04-27-picker-8-cases/`
