# Integrations — "Diplomatic embassies — each outside service, exactly one doorway we control."

> **Well G5** of 7. See [Gravity Wells Index](README.md) for the full map.

> External adapters — Firebase, Gemini, FX feed, PDF statement parser. Every outside service behind one doorway.

**Paths:** `backend/app/auth/firebase.py`, `backend/app/services/fx.py`, `backend/app/services/provider_retry.py`, `backend/app/services/scan_providers.py`, `backend/app/services/json_repair.py`

---

## Purpose

Like diplomatic embassies, each external service gets exactly one doorway gastify controls. G5 wraps Firebase Auth, Google Gemini (vision + PDF extraction), Open Exchange Rates FX API, and PDF parsing (PyMuPDF) so the rest of the system never imports an external SDK directly. Retry policies, error classification, response repair, and provider selection all live here. Downstream wells ask G5 for "the current user," "today's USD rate," or "extract this receipt," and G5 handles the flaky HTTP, the malformed JSON, the temporary API timeout—insulating domain logic from infrastructure brittleness.

## Key Components

### Authentication — Firebase Admin SDK

**File:** `backend/app/auth/firebase.py`

- **Initialization:** Singleton `_get_firebase_app()` loads credentials from file path, JSON env var, or Application Default (gcloud auth)
- **Token verification:** `get_current_user(request: Request) → FirebaseUser` extracts Bearer token from Authorization header, verifies JWT signature, returns `FirebaseUser(uid, email, name)`
- **Dependency injection:** Exports `CurrentUser = Annotated[FirebaseUser, Depends(get_current_user)]` for FastAPI route guards
- **Fail-closed:** Invalid/expired tokens → HTTPException 401; Firebase project ID defaults to `gastify-local` (non-existent) so production must set GASTIFY_FIREBASE_PROJECT_ID or auth fails immediately

### FX Rate API — Open Exchange Rates

**File:** `backend/app/services/fx.py`

- **Lazy read-through cache:** `get_fx_rate(db, from_currency, to_currency, rate_date) → FxResult` checks PostgreSQL first (PK: date+from+to), fetches external API on miss via open.er-api
- **Structural idempotency:** INSERT ON CONFLICT DO NOTHING dedupes cold-start races (two simultaneous requests for the same rate result in ≤1 external call, no data corruption)
- **Conversion helper:** `compute_usd_shadow(total_minor, from_exponent, fx_rate) → int` handles currency exponent mismatch (CLP exp=0, USD exp=2)
- **Retry policy:** 3s timeout, 3x attempts with exponential backoff (0.5s, 1s, 2s); raises FxServiceError after exhaustion

### AI Provider Retry — Generic Backoff Loop

**File:** `backend/app/services/provider_retry.py`

- **Shared mechanism:** `retry_provider_call(operation, operation_name, max_attempts, base_delay_seconds, sleep) → T` wraps async operations with exponential backoff
- **Error classification:** Permanent errors (bad API key, malformed request) raised immediately; transient errors (timeout, 503) retried. Classification delegated to `scan_errors.py` so each domain defines "transient"
- **Configurability:** max_attempts + delay configurable per call or via `settings.gemini_max_retries` + `settings.gemini_retry_delay_seconds`
- **Used by:** All three G4 agents (extraction, categorization, store_categorization) + statement extraction agents

### Provider Selection — Mock/Fixture/Gemini

**File:** `backend/app/services/scan_providers.py` + `backend/app/config.py` (validators)

- **Runtime resolution:** `active_scan_provider(settings) → str` returns the active provider name; respects `GASTIFY_SCAN_PROVIDER` env var or legacy `GASTIFY_E2E_SCAN_FIXTURES_ENABLED` flag
- **Deterministic fixture selection:** `mock_case_for_scan(filename) → E2EScanFixtureCase` picks happy/review/failure cases by filename token matching (enables per-test control)
- **Environment enforcement (D76):** `staging-e2e` unconditionally forces scan + statement providers to `fixture` (deterministic e2e, $0 cost); `staging` + `production` refuse `mock`/`fixture` (real Gemini guaranteed); checked at initialization in `config.py` validators
- **Impact:** Prevents real Gemini leakage into e2e tests; enables cheap reproducible screenshots

### JSON Repair — Gemini Output Recovery

**File:** `backend/app/services/json_repair.py`

- **Patterns fixed:** Markdown code fences (```json ... ```), line/block comments, unquoted property keys, single-quoted strings, trailing commas
- **Strategy:** Strip fences → remove comments → requote keys → replace quotes → remove trailing commas
- **Fallback:** `parse_json_with_repair(text) → Any` tries native json.loads first, then repairs, then raises original error if all fail
- **Security:** 512 KB input limit (ReDoS mitigation)

### PDF Evidence Extraction — PyMuPDF Adapter

**File:** `backend/app/services/statement_pdf_evidence.py`

- **Inspector:** `extract_statement_pdf_evidence(path, password) → StatementPdfEvidence` uses PyMuPDF to extract text layer, layout words, row groups; detects encrypted PDFs, password errors, read failures
- **Privacy:** Immutable `StatementPdfEvidence` guarantees no raw PDF bytes, no passwords, no decryption artifacts in `.provider_payload()` sent to Gemini
- **Evidence schema:** Versioned (`statement-pdf-evidence.v1`); captures page count, text char/line/word/row counts, checksums, warnings

### Statement Deterministic Routing — PyMuPDF + Regex

**File:** `backend/app/services/statement_routing.py`

- **Known issuers:** CMR, Edwards, Scotiabank; each has a custom regex/layout parser
- **Quality gate:** `deterministic_quality_passed(decision: StatementRoutingDecision) → bool` checks confidence ≥ 0.8 (configurable)
- **Output:** `StatementRoutingDecision(issuer, parser_id, confidence, reasons, fallback_required)` — if fallback_required, Gemini profile-inference path activates
- **Word-layout analysis:** Extracts columns by x-coordinate + regex patterns (dates, amounts, descriptions)

### Statement Layout Profile Fallback — Gemini Inference

**File:** `backend/app/services/statement_profile_fallback.py`

- **Compact evidence:** `build_statement_compact_evidence(pdf_evidence) → StatementCompactEvidence` produces schema-versioned input for Gemini profile inference
- **Profile application:** `apply_statement_layout_profile(evidence, profile) → StatementExtractionOutput` applies inferred field positions to compact row evidence
- **Result:** Deterministic column extraction without another full PDF parse; schema-versioned for reproducibility

### Runtime Configuration — Provider & Prompt Guards

**File:** `backend/app/config.py`

- **LLM policy enforcement:** `_normalize_and_guard_runtime_modes()` validator checks environment + provider combination; forces `staging-e2e` to `fixture`, blocks real providers in production if accidentally set to mock
- **Prompt validation:** Every configured prompt ID checked against prompt registry + environment constraints (dev-only prompts blocked in production)
- **Defaults:** `scan_provider=mock` (local), `statement_provider=auto` (codex-pdf-text → fallback to Gemini if text extraction fails)

### Extraction Agent — Receipt Vision

**File:** `backend/app/agents/extraction.py`

- **Agent:** PydanticAI `Agent[None, RawGeminiExtractionResult]` with configurable system prompt + model
- **Pipeline:** Image bytes → `retry_provider_call(agent.run(...))` → JSON repair → coalesce → log metrics
- **Output:** `ExtractionResult(extraction, usage, raw_extraction, prompt_id, model_name)`

### Statement Extraction Agent — PDF + Profile Fallback

**File:** `backend/app/agents/statement_extraction.py`

- **Main path:** PDF bytes → `extract_statement_with_gemini()` → Gemini agent via retry_provider_call → coalesce
- **Profile path:** Unknown layout → `infer_statement_layout_profile_with_gemini()` → returns layout schema → apply to evidence
- **Output:** `StatementAgentResult(extraction, usage, prompt_id, model_name, input_mode)`

## Key Decisions

**D2 (2026-04-23):** FX cache is lazy read-through, per-pair-per-day, write-once via INSERT ON CONFLICT. Eliminates need for background scheduler; structural idempotency dedupes cold-start race at zero code cost.

**D29 (2026-05-07):** Receipt extraction (vision + structured output + idempotency + dead-letter) at Enterprise tier. Three red-lines fire simultaneously: LLM output consumed by code (not regex), money debit requires idempotency, silent scan loss unrecoverable.

**D30 (2026-05-07):** Categorization + math gate at Enterprise tier. Structured output red-line fires again (V4 binding); typed error classification drives distinct recovery paths (needs_review vs retry vs dead-letter).

**D31 (2026-05-07):** Scan progress streaming at Enterprise. Real-time.Reconnection red-line: user-facing stream, MVP manual reload fails UX centerpiece. Dual transport SSE+WebSocket required.

**D44 (2026-05-20):** Accept receipt prompt v2-dev.9. Minor-review risks (discrepancies in math, item count, discount) acceptable IF app surfaces warnings + preserves item order for image comparison.

**D45 (2026-05-20):** Scan review signals stay in G4 (extraction, postprocessing, math reconciliation). Warning computation belongs in pipeline, not a separate well.

**D55 (2026-05-25):** Statement Gemini prompt lab + coalesce gate at Enterprise. Live provider extraction quality needs statement-only Gemini runner, no-cache evidence, coalesce diagnostics before promotion to production.

**D76 (2026-06-04):** Gemini provider selection by ENVIRONMENT, not flag. `staging-e2e` → fixture (deterministic, $0); `staging` + `production` → real Gemini (production-like). Enforced at initialization (config.py validators), preventing real-Gemini leakage into e2e tests even if GASTIFY_SCAN_PROVIDER=gemini is set by mistake.

## Invariants

**Single doorway per service:** No well directly imports Firebase, google.generativeai, httpx for FX, or fitz (PyMuPDF). All external calls route through G5 adapters.

**Firebase fail-closed:** HTTPException 401 on invalid/expired tokens. Default project ID `gastify-local` (non-existent) ensures production must explicitly set GASTIFY_FIREBASE_PROJECT_ID or tokens cannot verify.

**FX cache is immutable:** INSERT ON CONFLICT DO NOTHING makes (date, from_currency, to_currency) the canonical key. Subsequent reads always see the first-written rate for that day—no UPDATE, no cache invalidation logic.

**Error classification separates concerns:** Retry loop (provider_retry.py) knows only exponential backoff + max attempts. Domain-specific error classification (scan_errors.py) decides transient vs permanent. Keeps the mechanism generic, the domain-specific logic localized.

**Provider selection is environment-locked:** `staging-e2e` fixture mode is forced at initialization, not by a flag. Even GASTIFY_SCAN_PROVIDER=gemini cannot override it. Prevents accidental real Gemini in tests.

**JSON repair is conservative:** Fixes known Gemini malformation (fences, comments, quotes, commas) but does not reshape structure or migrate schemas. If repair fails, original error raised so upstream can classify it.

**Statement evidence is PCI-safe:** Raw PDF bytes, passwords, and decryption state never reach Gemini. Only structured row evidence + metadata shipped to LLM.

**Prompt configuration is validated at boot:** Every receipt/statement/categorization prompt ID checked against registry + environment constraints. Production cannot accidentally load a dev-only prompt version.

## Shipped State (Phase 6)

**Production live:**
- Firebase token validation (auth/firebase.py) — active in G3 auth/deps.py + G1 api/scan_stream.py WebSocket JWT verify
- FX cache + retry (services/fx.py) — live on production PostgreSQL; structural idempotency proven; backup/restore included in P1 snapshot
- Receipt extraction + JSON repair (agents/extraction.py + json_repair.py) — production scans all receipts through Gemini
- Categorization + math gate (agents/categorization.py, D30 typed errors) — live; error classification routing to needs_review/retry/dead-letter working
- Scan progress streaming (provider_retry.py + scan_stream) — SSE + WebSocket reconnection live across web + mobile
- Statement PDF extraction (agents/statement_extraction.py + statement_routing.py + statement_pdf_evidence.py) — operational; deterministic parsers (CMR, Edwards, Scotiabank) + Gemini fallback for unknown layouts; profile inference (D55) tested on private corpus
- Provider selection policy (D76) — enforced: staging-e2e runs fixture (deterministic e2e), staging+production run real Gemini
- All 5 Gemini prompt labs — receipt extraction, statement extraction, statement layout profile, item categorization, store categorization; all configurable at runtime per settings; gemini-2.5-flash-lite model

**No known issues.**

**Deferred (post-Phase 6):**
- Redis SETNX dedupe for FX cold-start race (D2) — structural idempotency deemed sufficient for scope-of-one
- Multi-model cascade (D29 fallback-chain) — deferred until second LLM provider justified
- Provider-side rate-limiting (D2) — scope-of-one volume acceptable; escalate on first 429
