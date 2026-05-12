# Active Plan — P2 Receipt Scan Pipeline

<!-- status: active -->
<!-- project_type: backend -->

## Goal

Deliver P2 Receipt Scan Pipeline — photo upload → two-stage Gemini vision-LLM extraction → math-reconciliation gate → V4 categorization → persisted transaction with USD shadow + dual-transport scan-progress streaming (SSE + WebSocket).

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning with 86-category V4 taxonomy, multi-currency analytics with USD-shadow
- **ROADMAP phase:** P2 Receipt Scan Pipeline (depends on P1 Foundation)
- **Covers REQs:** REQ-01 (submission), REQ-02 (two-stage worker), REQ-03 (V4 taxonomy), REQ-04 (dual streaming), REQ-12 (math gate)
- **Authored:** 2026-05-07
- **Last Updated:** 2026-05-12
- **Status:** active

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Scan schema + V4 taxonomy + image processing | `upload, data-migration, persistence` | Alembic `scans` table, V4 86-category seed, Pydantic scan schemas, Pillow image compression (1200x1600 JPEG 80%, thumb 120x160 JPEG 70%, EXIF strip, auto-rotate), scan submission endpoint | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 2 | Stage 1: Vision extraction worker | `ai-agent, async-worker, queue` | PydanticAI Gemini vision agent (output_type), GeminiExtractionResult model, output coalescing, currency-aware coercion, JSON repair, idempotent scan job, dead-letter + credit refund, per-call cost logging | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Stage 2: Categorization + math gate | `ai-agent, persistence` | PydanticAI text-only categorization agent, V4 taxonomy mapping, math reconciliation (sum check within 1 minor unit), MathReconciliationVerdict, persist Transaction + LineItem with USD shadow | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Scan progress streaming | `realtime, streaming` | SSE endpoint (web), WebSocket endpoint (mobile), ScanEvent contract, auto-reconnect (exp backoff), buffer backpressure, pipeline event emission integration | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Exit-signal + error case tests | `core-only` | 10 test receipts (8 benign, 2 adversarial, 1 math-inconsistent), legacy error cases (7 types), E2E integration proving REQs 01-04 + 12 | mvp | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state -->
<!-- Tier values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->

## Phase Details

### Phase 1 — Scan schema + V4 taxonomy + image processing

```yaml
phase: 1
types: [upload, data-migration, persistence]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, File/Media, Data]
suppressed_dims_count: 5
decisions_entry: D28
```

- **Types:** `upload, data-migration, persistence`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, File/Media, Data
- **Suppressed dimensions:** 5 (File/Media: Virus-scan, CDN, Retention; Data: Backup/restore, Indexing)
- **Grade overrides:** None — Enterprise baseline driven by File/Media.Image-pipeline resize-on-write
- **Key deliverables:**
  - Alembic migration: `scans` table (id, ownership_scope_id, status enum, image_path, thumbnail_path, original_filename, content_type, file_size_bytes, submitted_at, processed_at, error_code, error_message)
  - V4 category taxonomy seed: 86 categories (12 L1 + 44 L2 + 9 L3 + 42 L4), canonical PascalCase keys, trilingual display_labels (es/en/pt)
  - Pydantic schemas: ScanSubmission, ImageMeta, ScanResult, ScanEvent, GeminiExtractionResult, CategorizationResult, MathReconciliationVerdict
  - Image compression service (Pillow): 1200x1600 max JPEG 80%, thumbnail 120x160 JPEG 70%, EXIF strip (implicit on JPEG save), auto-rotate via ImageOps.exif_transpose
  - POST /api/v1/scans endpoint (accepts multipart image, runs compression, stores image + thumbnail, returns scan_id)
- **Legacy port:** Image pipeline ported from BoletApp `functions/src/imageProcessing.ts` (sharp/MozJPEG → Pillow equivalent)
- **Trade-offs accepted:** See D28

### Phase 2 — Stage 1: Vision extraction worker

```yaml
phase: 2
types: [ai-agent, async-worker, queue]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, AI/Agent, Background jobs]
suppressed_dims_count: 1
decisions_entry: D29
```

- **Types:** `ai-agent, async-worker, queue`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, AI/Agent, Background jobs
- **Suppressed dimensions:** 1 (BG-jobs.Scheduling — scans are user-initiated, not scheduled)
- **Grade overrides:** None — Enterprise baseline forced by 3 red-lines (structured output, idempotency, dead-letter)
- **Key deliverables:**
  - PydanticAI agent: Gemini vision model with output_type=GeminiExtractionResult (V1 value: Enforce Output Structure)
  - GeminiExtractionResult model: merchant_name, transaction_date, currency_code, total_amount, tax_amount, discount_amount, line_items[], confidence_score
  - Output coalescing (legacy port from BoletApp `analyzeReceipt.ts`): null merchant→"Unknown", null date→scan_date, null category→"Other", strip Chilean thousands separators (e.g., "1.234" → 1234 for CLP), drop zero-price items, fallback total = sum(line_items)
  - Currency-aware numeric coercion: CLP/JPY/KRW (exponent=0) treat integers as-is; USD/EUR/GBP (exponent=2) multiply parsed float by 100 to get minor units
  - JSON markdown-wrapper repair: strip ```json...``` and trailing ``` from Gemini output (port from BoletApp `jsonRepair.ts`)
  - Idempotent scan processing: scan_id as natural idempotency key, status machine (submitted → processing → extracted → categorized → completed | failed)
  - Dead-letter on permanent failure: classify errors as transient (retry up to 3x) vs permanent (dead-letter + credit refund). Port from BoletApp error classification.
  - Per-call cost logging: tokens_in, tokens_out, cost_usd, latency_ms logged to structured log per V4 value (Measure Every Run)
- **Legacy port:** Extraction logic from BoletApp `processReceiptScan.ts` + `analyzeReceipt.ts`; error handling from `retryHelper.ts` + `errorHandler.ts`
- **Trade-offs accepted:** See D29

### Phase 3 — Stage 2: Categorization + math gate

```yaml
phase: 3
types: [ai-agent, persistence]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, AI/Agent, Data]
suppressed_dims_count: 2
decisions_entry: D30
```

- **Types:** `ai-agent, persistence`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, AI/Agent, Data
- **Suppressed dimensions:** 2 (Data: Backup/restore — infrastructure level; Migration safety — no new migration this phase)
- **Grade overrides:** None — Enterprise baseline forced by AI/Agent.Structured-output red-line (V4 taxonomy binding feeds math gate + persistence)
- **Key deliverables:**
  - PydanticAI agent: Gemini text-only model with output_type=CategorizationResult (V1 + V3 values: Enforce Output Structure + Route by Cost — text-only cheaper than vision)
  - CategorizationResult model: per line-item category mapping (L1→L4 hierarchy from V4 taxonomy), confidence per mapping
  - Math reconciliation gate: sum(line_items) + tax - discount == total within 1 minor unit tolerance per currency. MathReconciliationVerdict(passed: bool, discrepancy_minor_units: int, adjusted_total: int | None)
  - Route math-inconsistent receipts to status=needs_review instead of auto-completing
  - Persist final Transaction + LineItem rows: ownership_scope_id from auth, USD shadow via P1 FX service, category_id FK to V4 taxonomy
  - Typed error handling: reconciliation_mismatch, category_not_found, extraction_timeout — each drives distinct downstream behavior
- **Two-stage defense against prompt injection:** Vision stage extracts raw fields only; categorization stage receives extracted text, never raw image. Injected text in receipt images cannot steer the categorization prompt.
- **Trade-offs accepted:** See D30

### Phase 4 — Scan progress streaming

```yaml
phase: 4
types: [realtime, streaming]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Real-time]
suppressed_dims_count: 2
decisions_entry: D31
```

- **Types:** `realtime, streaming`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Real-time
- **Suppressed dimensions:** 2 (Real-time: Presence — single-user scan stream; Message order — pipeline events naturally stage-ordered)
- **Grade overrides:** None — Enterprise baseline forced by Real-time.Reconnection red-line (user-facing stream, manual reload = dead UI mid-scan)
- **Key deliverables:**
  - SSE endpoint: GET /api/v1/scans/{scan_id}/events (web clients)
  - WebSocket endpoint: /ws/scans/{scan_id} (mobile clients)
  - ScanEvent contract: {event_type: str, scan_id: uuid, step: str, progress_pct: int, data: dict | None, error: dict | None}
  - Event types: scan_started, image_processed, extraction_complete, categorized, math_verified, scan_complete, scan_failed
  - Auto-reconnect: server heartbeat every 15s; client reconnects with exponential backoff (V2 value: Stream Progress)
  - Buffer backpressure: server-side buffer with size limit (32 events max per connection, drop-oldest policy)
  - Pipeline integration: event emission at each stage of Phase 2+3 processing
  - PENDING P18 awareness: BaseHTTPMiddleware has known streaming limitations. SSE implementation must test under current middleware; if issues, extract streaming endpoints to pure ASGI.
- **Trade-offs accepted:** See D31

### Phase 5 — Exit-signal + error case tests

```yaml
phase: 5
types: [core-only]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D32
```

- **Types:** core-only
- **Tier:** mvp
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dimensions:** 0
- **Grade overrides:** None — happy-path + edge-case assertion
- **Key deliverables:**
  - 10 test receipts: 8 benign (mixed CLP/USD, Spanish + English, 5-40 line items, varied merchant types), 2 adversarial (embedded prompt-injection attempts in receipt text), 1 math-inconsistent (items don't sum to stated total)
  - Legacy error case tests (port from BoletApp `errorHandler.ts`): NETWORK_ERROR, TIMEOUT_ERROR, PERMISSION_DENIED, STORAGE_QUOTA, NOT_FOUND, VALIDATION_ERROR, UNKNOWN_ERROR
  - E2E integration tests: upload → compress → extract (Gemini) → categorize → math gate → persist → verify Transaction + LineItem correctness
  - Streaming test: SSE events delivered in pipeline order for both successful and failed scans
  - Adversarial test: prompt-injection receipt images produce safe extraction output (no category/merchant steering)
  - Math-gate test: inconsistent receipt routes to needs_review, not completed
  - Credit refund test: permanent failure returns credit to user balance
  - REQs proven: REQ-01 (submission), REQ-02 (two-stage worker), REQ-03 (V4 taxonomy), REQ-04 (dual streaming), REQ-12 (math gate)
- **Exit signal per ROADMAP:** 10 test receipts processed; 8 benign correct; 2 adversarial safe; 1 math-inconsistent routed to review. Streaming events delivered in order on both transports.
- **Trade-offs accepted:** See D32

## Current Phase

Phase 2: Stage 1: Vision extraction worker

## Dependencies

- Phase 1 depends on P1 Foundation (app + DB scaffold, auth, money/FX, observability)
- Phase 2 depends on Phase 1 (scan schema + image processing service)
- Phase 3 depends on Phase 2 (needs extraction results to categorize + reconcile)
- Phase 4 depends on Phase 3 (needs full pipeline to emit all event types)
- Phase 5 depends on Phases 1-4 (exit-signal spans entire pipeline)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Gemini vision API accuracy on Chilean receipts (Spanish text, CLP formatting) | high | V4 taxonomy prompt ported from BoletApp (proven on Chilean receipts); eval set of 10 receipts validates accuracy |
| Prompt injection via receipt image text | high | Two-stage defense: vision extracts raw fields only, categorization receives text not image; adversarial test receipts validate |
| Math reconciliation false-negatives (receipts with legitimate rounding) | medium | 1 minor-unit tolerance per currency; needs_review status prevents silent data loss |
| BaseHTTPMiddleware streaming limitations (PENDING P18) | medium | Test SSE under current middleware; if issues, extract streaming endpoints to pure ASGI |
| Gemini API rate limits at scale | low | Enterprise-tier retry + exponential backoff; per-call cost logging surfaces budget issues early |
| Image compression quality vs file size trade-off | low | Port proven BoletApp parameters (80% quality, 1200x1600 max); adjust only if Gemini accuracy drops |

## Notes

- Two-stage extraction is the defense architecture against prompt injection (SCOPE research). Stage 1 (vision) only extracts raw field values — no category mapping. Stage 2 (text-only) maps to V4 taxonomy from extracted text, never seeing the raw image. Injected instructions in receipt images cannot influence categorization.
- Legacy BoletApp scan pipeline code at `/home/khujta/projects/bmad/boletapp/` serves as reference for: image compression parameters, V4 taxonomy prompt, output coalescing rules, error classification, retry logic, JSON repair. Port decisions should preserve proven behavior; depart only with documented rationale.
- P1 Foundation's observability pipeline (per-scan metric columns) is the sink for this plan's per-call cost/latency logging. Phase 2+3 emit into the columns established in P1 Phase 5.
- Tier distribution: mvp x 1 (Phase 5 test-only), ent x 4 (Phases 1-4). No scale-tier overrides. Enterprise floor driven by AI/Agent structured-output red-line (Phases 2, 3) + Real-time reconnection red-line (Phase 4) + File/Media image-pipeline (Phase 1).
- PENDING P6-P10 (rebuild-only findings from BoletApp scan-picker verification) inform Phase 5 error case testing but are not directly fixed in this plan — they are UX-layer findings that land in P3 Web Portal / P4 Mobile App.

## Plan Creation Log

- **2026-05-07 — PLAN CREATED:** 5 phases | high complexity | mvp maturity. TIERS: mvp x 1, ent x 4, scale x 0. 0 grade overrides (Enterprise baseline on all ent phases — red-lines set the floor, no overrides needed). 12 suppressed dims. DECISIONS D28→D32. Covers REQ-01, REQ-02, REQ-03, REQ-04, REQ-12.
