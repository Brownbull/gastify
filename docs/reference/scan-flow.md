# Scan flow — reference doc

> Designers and engineers needing to walk the scan flow at a single sitting:
> this is the navigable map. Storybook covers self-contained screens (Dashboard,
> Trends, History) but **NOT** the scan flow because it's orchestrator-driven —
> see [frontend/STORIES.md](../../frontend/STORIES.md) "Scope boundary" for the
> reasoning. To inspect the live flow, run the app and follow the steps below.

## How to inspect the live flow

```bash
cd frontend
npm run dev   # http://localhost:5174
```

Sign in (mocked Firebase auto-seeds 4 test users on first run) → land on the
Dashboard → tap the green camera FAB at the bottom-center to enter the scan
flow. Each phase below maps to a Zustand store value
(`useScanStore.getState().phase`) you can inspect via React DevTools.

For pixel-level designer reference, screenshot the live app at each phase. The
markdown below intentionally does not embed images so it stays low-maintenance
when components change visually.

## Orchestrator

The scan flow is dispatched by [`ScanFeature.tsx`](../../frontend/src/features/scan/ScanFeature.tsx)
based on the `phase` selector:

| `phase` | Component shown | Notes |
|---------|-----------------|-------|
| `idle` | [`IdleState`](../../frontend/src/features/scan/components/states/IdleState.tsx) | Rarely user-facing — the Dashboard FAB usually triggers the next phase before this card renders |
| `capturing` (mode=`single`) | Camera input UI (handler-driven; uses a hidden file input + `getUserMedia` if available) | Permission prompts on first capture |
| `capturing` (mode=`batch`) | [`BatchCaptureView`](../../frontend/src/features/batch-review/views/BatchCaptureView.tsx) | Multiple receipts queued before processing |
| `capturing` (mode=`statement`) | [`StatementPlaceholder`](../../frontend/src/features/scan/components/states/StatementPlaceholder.tsx) | PDF statement upload path |
| `scanning` | [`ScanOverlay`](../../frontend/src/features/scan/components/ScanOverlay.tsx) | Indeterminate spinner (single) or % progress (batch) |
| `reviewing` (mode=`single`) | [`TransactionEditorView`](../../frontend/src/features/transaction-editor/views/TransactionEditorViewInternal.tsx) | Item editor with confidence badges |
| `reviewing` (mode=`batch`) | [`BatchReviewView`](../../frontend/src/features/batch-review/views/BatchReviewView.tsx) | Multi-receipt review queue |
| `saving` | [`SavingState`](../../frontend/src/features/scan/components/states/SavingState.tsx) | Brief saving indicator |
| `error` | [`ScanError`](../../frontend/src/features/scan/components/ScanError.tsx) | Variant per error type — see "Error variants" below |

Dialog overlays (rendered alongside the phase view, driven by
`useScanStore.getState().activeDialog.type`):

| Dialog `type` | Component | When |
|---------------|-----------|------|
| `QUICK_SAVE` | [`QuickSaveCard`](../../frontend/src/features/scan/components/QuickSaveCard.tsx) | After single-mode review confirms |
| `BATCH_COMPLETE` | [`BatchCompleteModal`](../../frontend/src/features/scan/components/BatchCompleteModal.tsx) | After batch processing finishes |
| `CURRENCY_MISMATCH` | [`CurrencyMismatchDialog`](../../frontend/src/features/scan/components/CurrencyMismatchDialog.tsx) | Scan currency ≠ user default |
| `TOTAL_MISMATCH` | [`TotalMismatchDialog`](../../frontend/src/features/scan/components/TotalMismatchDialog.tsx) | Items sum ≠ scanned total |

## Phase-by-phase walkthrough

### 01 · Capture

User taps the FAB → orchestrator transitions `idle → capturing`. The
`capturing` phase has three sub-modes:

- **single** — one receipt at a time. UI is the camera input flow.
- **batch** — multiple receipts queued. UI is `BatchCaptureView` with thumbnail
  queue, capture button, and "switch to single mode" affordance.
- **statement** — PDF upload (no camera). UI is `StatementPlaceholder`.

The mode is selected before tapping the FAB (mode picker on the dashboard).
The default is `single`. Switching modes mid-flow resets the scan state.

### 02 · Processing

After the user captures the photo (or finishes the batch queue), the
orchestrator transitions `capturing → scanning`. `ScanOverlay` renders on top
of the previous view with:

- **single** — indeterminate spinner with "Scanning…" message
- **batch** — progress bar showing `<completed + failed> / <total>` percentage,
  per-receipt status indicators

Cancel button returns the user to the previous phase (typically `idle`).

### 03 · Review

The vision LLM extraction completes, transitioning `scanning → reviewing`.
The user lands on the item editor:

- **single** — `TransactionEditorView` shows merchant, total, items list with
  confidence badges. Low-confidence items get a visual flag (PENDING.md P9
  notes the previous attempt rendered low-confidence identically to high; the
  rebuild must surface this distinction).
- **batch** — `BatchReviewView` shows the queue of scanned receipts; user can
  swipe through, review each, accept or reject.

User edits items inline, fixes category/subcategory mappings, then taps
Save → transition to `saving`.

### 04 · Save

Brief `saving` phase shows `SavingState` (loading indicator). Once the
transaction(s) commit:

- **single** — `QuickSaveCard` overlays the dashboard with transaction summary
  (merchant, total, item count, "view details" link).
- **batch** — `BatchCompleteModal` overlays the dashboard with N-receipts
  summary + per-receipt status (saved / failed).

User dismisses → returns to dashboard with the new transaction visible in
"Últimos Escaneados".

## Error variants

`ScanError` renders when `phase === 'error'`. Error type is derived from the
error message via `getErrorTypeFromMessage()` in
[`ErrorState.tsx`](../../frontend/src/features/scan/components/states/ErrorState.tsx)
— currently maps to:

| Type | Triggered by | Icon | Retry behavior |
|------|--------------|------|----------------|
| `network` | "network", "internet", "connection", "offline" in message | `WifiOff` (or similar) | retry resets to `capturing` |
| `timeout` | "timeout", "timed out", "took too long" | clock icon | retry resets to `capturing` |
| `unknown` | anything else | generic alert | retry resets to `capturing` |

**PENDING.md P6 — known bug from previous attempt:** the error dialog ignores
`error.message`, so all variants render with the same generic body text. The
rebuild must surface distinct UX per error type. See `.kdbp/PENDING.md` row P6.

## Known UX failures from the previous attempt

These are tracked in `.kdbp/PENDING.md` as `rebuild-only` items — explicit
requirements for the rebuild, not bugs to fix in legacy:

| ID | What | Where it surfaces |
|----|------|-------------------|
| **P6** | Error dialog ignores `error.message` — all errors render identical body | Phase `error` / `ScanError` |
| **P7** | Currency-mismatch "Use default" overwrites currency without FX conversion (e.g., $48.50 USD becomes 48 CLP — data corruption) | Dialog `CURRENCY_MISMATCH` / `CurrencyMismatchDialog` |
| **P8** | Unknown-merchant scans render identically to known-merchant — no "first scan here" affordance for category/rename prompts | Phase `reviewing` / `TransactionEditorView` |
| **P9** | Low-confidence scans show literal "Unknown" string + same UX as high-confidence — no badge, no review prompt | Phase `reviewing` / `TransactionEditorView` |
| **P10** | i18n keys leak to UI as literal strings (`scanError` rendered as title) | All phases — needs CI translation-coverage gate |

## Why this isn't a Storybook story

The scan flow has three properties that make it a poor Storybook fit:

1. **Orchestrator-driven** — components are selected by `phase`, not props.
   Storying any single component requires a wrapper to seed the Zustand store.
2. **Device-API-coupled** — single-mode capture depends on `getUserMedia` /
   file input. The camera viewfinder needs real browser permissions.
3. **Deep multi-context** — `TransactionEditorView` is 1147+ lines and reads
   from category-picker context, scan results, confidence state, currency
   preferences, locale, etc. The mocking surface exceeds the mockup value.

The previous attempt to story `IdleState` (commit `1c75ef4`, reverted as
`5a39a10`) manufactured PENDING.md P10's exact i18n key leak in the story
itself — proof that forcing this flow into Storybook costs more than it
saves. The scope boundary is documented in
[frontend/STORIES.md](../../frontend/STORIES.md) "Scope boundary".

## Updating this doc

When the scan flow's component layout changes:

1. Update the orchestrator table at the top.
2. Update the phase walkthrough sections.
3. Cross-check `.kdbp/PENDING.md` rows P6–P10 for status changes (open vs
   resolved).
4. Add a dated entry to `.kdbp/LEDGER.md` recording the doc update.

This doc is the single source of "where are the scan components and what does
the user see" for designers and onboarding engineers. Keep it accurate.
