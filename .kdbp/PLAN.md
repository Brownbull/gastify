# Active Plan — P5 Statement Reconciliation + Cards

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-24 -->
<!-- last_updated: 2026-05-27 -->

## Goal

Implement P5: PDF statement upload → extraction → match against existing receipts → three-bucket reconciliation view with coverage metric, plus card alias CRUD with no PCI data.

## Context

- Roadmap phase: P5 Statement Reconciliation + Cards.
- Scope requirements: REQ-07, REQ-08, REQ-09.
- Depends on P2 receipt scan extraction and transaction persistence.
- May run in parallel with P6, but this plan owns only statement reconciliation and cards.
- Runtime closure requires Railway staging evidence for Postgres, file/media, worker behavior, user-visible web results, and Android/S23 results.
- iOS runtime testing is deferred post-roadmap by D47/P31 and is not a P5 blocker.
- P5 implementation begins with Phase 0 statement-corpus discovery and prompt-lab contract design before runtime schema/UI work.
- Phase 4 is the live Gemini statement prompt-lab quality gate. Current product decision promotes Gemini fallback with caveats for unsupported readable text-layer statements; deterministic PyMuPDF remains primary for known layouts.

## Environment Gate Standard

Runtime-gated P5 phases must close against branch-backed Railway staging evidence before review. Local unit, integration, and fixture runs are development evidence; they do not close user-facing upload, worker, web, or Android runtime gates by themselves.

- `staging-e2e` may use deterministic statement/receipt fixtures for repeatable P5 proof.
- `staging` live-provider proof is required before promoting provider-facing statement extraction behavior.
- Web proof must exercise the deployed web/API path, not only jsdom.
- Android proof must run on the Samsung S23 lane and preserve grouped stage-run artifacts.
- iOS proof stays deferred until the post-roadmap iOS lane is pulled forward.

## Phase Tracker

| Phase | Name | Tier | Exec | Review | Commit | Push |
|---|---|---|---:|---:|---:|---:|
| 0 | Statement corpus + extraction contract preflight | ent | ✅ | ✅ | ✅ | ✅ |
| 1 | Card alias + statement schema foundation | ent | ✅ | ✅ | ✅ | ✅ |
| 2 | Statement PDF upload + extraction worker | ent | ✅ | ✅ | ✅ | ✅ |
| 3 | Reconciliation engine + coverage metric | ent | ✅ | ✅ | ✅ | ⬜ |
| 4 | Statement Gemini prompt lab + coalesce gate | ent | ✅ | ✅ | ✅ | ✅ |
| 5 | Web statement reconciliation flow | ent | ✅ | ✅ | ✅ | ✅ |
| 6 | Android mobile statement reconciliation flow | ent | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | P5 exit gate + edge tests | ent | ⬜ | ⬜ | ⬜ | ⬜ |

## Phase Details

### Phase 0 — Statement corpus + extraction contract preflight

```yaml
types: [ai-agent, test, file-media, data-contract]
tier: ent
prototype: false
decision: D54
requirements: [REQ-07, REQ-08, REQ-09]
```

Build the pre-runtime statement prompt-lab lane:

- Import the legacy `CreditCard` PDF corpus into gitignored local fixture storage.
- Commit only sanitized statement corpus manifests; never commit raw PDFs or `credentials.json`.
- Add statement-specific prompt-lab case discovery, prompt registry kind, Pydantic contracts, Codex PDF text extraction, and scoring.
- Run Codex-only extraction for one representative PDF from each issuer before Gemini iteration.
- Treat encrypted PDFs as first-class behavior: password required, password invalid, and password-supplied success states.
- Define the statement output contract before database/runtime implementation: metadata, lines, processing warnings, alias-only card identity, and future reconciliation verdicts.

Exit signal:

- Corpus manifest records all 24 legacy PDFs with issuer, filename, hash, page count, encryption status, and password-source flag.
- CMR, Edwards, and Scotiabank sample PDFs each have ignored Codex extraction packets.
- Tests prove private import behavior, encryption/password states, statement prompt kind, and statement-specific scoring.
- The next phase may begin only after this contract is reviewed.

### Phase 1 — Card alias + statement schema foundation

```yaml
types: [data-migration, persistence, auth, multi-tenant]
tier: ent
prototype: false
decision: D48
requirements: [REQ-07, REQ-08, REQ-09]
```

Build the storage and API contract foundation:

- Card alias model and CRUD contract with only `name`, `created_at`, and `archived_at`; no card number, PAN fragment, CVV, expiry, issuer account number, or PCI-like fields.
- Statement upload/job, statement line, reconciliation run, and reconciliation verdict persistence.
- Ownership-scope enforcement and RLS/migration coverage consistent with existing transaction and scan tables.
- Statement lifecycle states ready for upload → extraction → reconciling → completed/failed.
- API schemas and service boundaries that keep user-edited transaction data authoritative.

Exit signal:

- Backend migrations and tests pass locally.
- Schema and API contract review confirms no PCI-shaped fields.
- Staging DB migration smoke passes before later phases depend on the tables.

### Phase 2 — Statement PDF upload + extraction worker

```yaml
types: [upload, file-media, ai-agent, async-worker, streaming]
tier: ent
prototype: false
decision: D49
requirements: [REQ-07]
```

Implement the statement ingestion path:

- Authenticated statement PDF upload endpoint.
- Railway-volume-backed statement file/media persistence and metadata.
- Async worker path that invokes the statement extraction prompt/provider and emits typed transaction-line records.
- Fixture provider path for deterministic `staging-e2e` proof.
- Status/event stream entries for queued, picked_up, llm_start, llm_end, reconciling, completed, and failed.
- Failure handling for invalid PDF, encrypted PDF, empty extraction, provider failure, and retry-safe duplicate upload.

Exit signal:

- Local backend tests cover upload, storage metadata, extraction success, extraction failure, and event emission.
- Railway `staging-e2e` PDF upload fixture run proves deployed Postgres, file/media, and worker behavior.

### Phase 3 — Reconciliation engine + coverage metric

```yaml
types: [persistence, user-facing, client-state]
tier: ent
prototype: false
decision: D50
requirements: [REQ-08]
```

Build deterministic matching between statement lines and receipt-sourced transactions:

- Before any Gemini statement prompt iteration or live-provider statement extraction scoring,
  create private `.expected.json` baselines from Codex/manual review for the representative
  statement corpus set. Minimum first pass: one CMR, one Edwards, and one Scotiabank
  statement, expanding toward the full 24-PDF corpus before promotion.
- Match by merchant, date, amount, currency, and card alias.
- Respect tolerance rules: date ±3 days, amount within 1% or currency-minimum-unit, and configurable fuzzy merchant matching.
- Produce matched, statement-only, and receipt-only buckets.
- For positive statement-only spend lines, return a ready-to-create transaction
  candidate with `receipt_type=statement` and one flagged `Unidentified statement
  item`; do not auto-create it until the user accepts it.
- Compute coverage metric and persist line verdicts.
- Preserve user-edited transaction precedence and avoid overwriting user corrections.
- Support idempotent reruns and explicit ambiguous-match handling.

Exit signal:

- Statement expected baselines exist for the representative issuer set before any Gemini
  statement prompt result is scored or used as reconciliation quality evidence.
- Backend tests cover exact matches, fuzzy matches, no matches, ambiguous matches, archived alias behavior, and user-edited precedence.
- Railway `staging-e2e` seeded receipt + statement run returns the three buckets and coverage metric through the deployed API.

### Phase 4 — Statement Gemini prompt lab + coalesce gate

```yaml
types: [ai-agent, prompt-lab, data-contract, test]
tier: ent
prototype: false
decision: D55
requirements: [REQ-07, REQ-08]
```

Build and run the real statement Gemini quality loop before UI implementation depends on live-provider quality:

- Keep the statement Gemini agent separate from receipt extraction. Runtime fallback uses compact `profile-rows` evidence; direct PDF Gemini remains prompt-lab/debug only.
- Decrypt encrypted private PDFs only in memory when local credentials are available; never write decrypted PDFs, passwords, raw PDF bytes, PAN/CVV/expiry, or raw statement text to committed files.
- Add `statement-run` with dry-run, cache-only, cache-bypass, live-cost confirmation, credentials-root, prompt/model, run-id, and case/limit controls.
- Add statement-specific cache keys using `statement-prompt-lab.v1`, PDF hash, prompt hash, model, encrypted/decrypted marker, and expected fixture identity.
- Add statement coalesce/normalization for currencies, source order, line types, optional fields, provider metadata, confidence, and warnings.
- Preserve raw Gemini output separately from processed statement output; statement-only transaction candidates stay in reconciliation, not extraction.
- Add `statement-batch-report` to summarize pass/fail, provider errors, cache/no-cache status, token/cost totals, line deltas, field mismatches, reconciliation bucket effects, and failure ownership.
- Run the first representative no-cache Gemini pass on `cmr/cmr202503`, `edwards/edw202506`, and `scotiabank/sco202206` only with explicit live-cost confirmation.
- Track API cost controls: compact evidence v2 experiment, deterministic calls avoided, fallback calls made, average tokens/cost, highest-cost case, and cost per ledger-ready line.
- Compact evidence v2 is cost-promising but not promoted yet: the 7-case live run reduced token/cost totals but reintroduced amount mismatches, so runtime keeps the previous P0-clean compact profile path.

Exit signal:

- Real Gemini statement runs exist for the current baselined statement set with no cache reuse when extraction behavior changes.
- Every run has `pdf_input.json`, `raw_output.json`, `processed_output.json`, `field_provenance.json`, `score.json`, `reconciliation.json`, `payload_examples.json`, `cost_summary.json`, and `manifest.json`.
- Provider errors and extraction failures are classified as prompt, coalesce, PDF/OCR/provider, baseline truth, or expected fixture gap.
- Reports keep strict fixture diagnostics separate from runtime fallback readiness; `fallback_promoted_with_caveats` is accepted when date, amount, currency, and candidate safety pass.
- Full 24-PDF corpus expansion remains later quality hardening before production provider promotion, not a blocker for building Web UI against stable API contracts.

### Phase 5 — Web statement reconciliation flow

```yaml
types: [web, user-facing, client-state, upload, realtime, file-media]
tier: ent
prototype: false
decision: D51
requirements: [REQ-07, REQ-08, REQ-09]
```

Expose P5 in the web app:

- Card alias CRUD UI with no PCI-shaped inputs.
- Statement upload flow with progress and recoverable errors.
- Coverage metric summary and three-bucket reconciliation view.
- Drilldown for matched, statement-only, and receipt-only rows.
- SSE progress handling with reconnection behavior.
- Sign-out/cache isolation so statement and reconciliation data do not leak across sessions.

Exit signal:

- Web unit/component tests cover card aliases, upload states, buckets, coverage, and sign-out cleanup.
- Deployed Railway web/API browser proof captures the P5 statement journey against `staging-e2e`.

### Phase 6 — Android mobile statement reconciliation flow

```yaml
types: [native-mobile, user-facing, client-state, upload, realtime, streaming, file-media]
tier: ent
prototype: false
decision: D52
requirements: [REQ-07, REQ-08, REQ-09]
```

Add the Android-native P5 journey:

- Statement PDF picker/upload entry point.
- Card alias selection/creation surface with no PCI-shaped inputs.
- WebSocket progress handling for statement extraction and reconciliation.
- Coverage summary plus three-bucket drilldown in the mobile transaction/reconciliation area.
- Cache/session cleanup consistent with P4 sign-out isolation.
- Android/S23 runtime gate only; iOS remains deferred by D47/P31.

Exit signal:

- Mobile typecheck/Jest cover the P5 Android flow and state transitions.
- Samsung S23 `staging-e2e` run captures statement upload, progress, reconciliation buckets, coverage metric, and sign-out cleanup with grouped stage artifacts.

### Phase 7 — P5 exit gate + edge tests

```yaml
types: [core-only, test, web, native-mobile]
tier: ent
prototype: false
decision: D53
requirements: [REQ-07, REQ-08, REQ-09]
```

Close the P5 journey with edge coverage and artifact-backed proof:

- End-to-end statement journey with 20 days of receipt scans, monthly statement upload, coverage metric, and drilldown into the unreconciled bucket.
- Edge tests for encrypted/invalid PDF, duplicate upload idempotency, extraction failure, no matches, ambiguous matches, archived alias, user-edited transaction precedence, and sign-out mid-stream.
- P18 streaming middleware probe for SSE/WebSocket behavior under the new statement flow.
- Evidence packet tying migrations, worker, API, web UI, and Android/S23 proof together.

Exit signal:

- Full local test suite and relevant lint/type gates pass.
- Railway staging and staging-e2e checks are green.
- Web browser evidence and Android/S23 stage artifacts prove the deployed P5 journey.
- `.kdbp/REVIEW.md` approves P5 with iOS still explicitly deferred.

## Current Phase

Phase 5: Web statement reconciliation flow.

## Dependencies

- Phase 0 must land before Phase 1; it defines the statement input/output contract.
- Phase 1 must land before Phases 2 and 3.
- Phase 2 must land before deployed reconciliation proof can close.
- Phase 3 must land before web/mobile bucket views are meaningful.
- Phase 4 has promoted Gemini fallback with caveats for unsupported readable text-layer PDFs; future iterations must preserve P0 readiness and cost controls.
- Phases 5 and 6 may proceed in parallel after Phase 3 API contracts stabilize; they do not require Phase 4 to prove live Gemini quality if they use fixture-backed contracts.
- Phase 7 closes only after Phases 1-6 are reviewed, committed, and pushed.

## Risks

| Risk | Handling |
|---|---|
| Statement PDF/provider variability | Use deterministic fixture provider for `staging-e2e`; require live-provider proof before promotion. |
| Private statement data leakage | Keep raw PDFs, credentials, and Codex text packets ignored; commit sanitized manifests only. |
| Encrypted statement PDFs | Model password-required, password-invalid, and password-supplied success states before runtime upload work. |
| PCI scope creep through card aliases | Schema and UI accept aliases only; review blocks PAN fragments, CVV, expiry, or account fields. |
| P18 `BaseHTTPMiddleware` streaming limitations | Treat new statement SSE/WS runtime proof as a trigger to probe or rewrite the middleware path if it interferes. |
| False positive/negative matches | Persist verdicts, expose buckets, handle ambiguous matches explicitly, and avoid silent auto-merge. |
| User edits overwritten by reconciliation | User-edited transaction fields stay authoritative. |
| Railway volume portability | Keep file/media metadata explicit and record storage assumptions in review evidence. |
| iOS runtime missing | Accepted by D47/P31; Android/S23 is the P5 native runtime gate. |
| Staging data pollution | Use scoped staging-e2e fixtures and cleanup/reset helpers for repeatable proof. |
| Prompt-lab live-cost drift | Require `statement-run --live --confirm-live-cost` and batch cost artifacts before live Gemini evidence is accepted. |

## Runtime Evidence Checkpoints

- Phase 0: statement corpus manifest, Codex-only issuer sample extraction packets, and prompt-lab contract tests.
- Phase 1: backend migration/test evidence and staging DB readiness.
- Phase 2: deployed PDF upload + extraction worker artifact under `tests/.../results` or equivalent KDBP-linked evidence.
- Phase 3: deployed API reconciliation response with matched, statement-only, receipt-only, and coverage metric.
- Phase 4: representative statement Gemini run folders plus `statement-live-summary.json` and `statement-live-analysis.md`.
- Phase 5: deployed web browser evidence for statement upload and bucket drilldown.
- Phase 6: S23 Android `staging-e2e` stage folder with manifest, screenshots, and passed flow manifests.
- Phase 7: consolidated P5 evidence packet referenced from `.kdbp/LEDGER.md` and reviewed in `.kdbp/REVIEW.md`.

## Notes

- P24 remains a receipt review-warning UX item and is not closed by this plan unless the statement UI work directly resolves it.
- P31/D47 keeps iOS runtime proof deferred post-roadmap.
- P25/D46 Render fallback remains post-launch architecture debt; P5 stays on Railway for runtime proof.
- Phase 0 is intentionally pre-runtime: no database migrations, runtime upload endpoints, web UI, or mobile UI should be implemented until it is reviewed.
