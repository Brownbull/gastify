# Statement Prompt Lab Pipeline

P5 statement reconciliation starts with a private statement-corpus lane before any
runtime database or UI work.

## Boundary From Receipt Scanning

Statement scanning is a separate pipeline, not a receipt prompt-lab extension.

- Receipt scanning starts from image evidence and produces item-level
  transactions through `coalesce_extraction()`, item categorization, and the
  receipt math gate.
- Statement scanning starts from PDF statement lines and produces settlement
  coverage: matched receipt transactions, statement-only lines, receipt-only
  transactions, ambiguous matches, and failed states.
- Receipt prompt-lab cases remain under `prompt-testing/test-cases/receipts/`.
  Credit-card statement PDFs remain under
  `prompt-testing/test-cases/statements/private/`.
- Receipt prompts use kind `receipt-extraction`; statement prompts use kind
  `statement-extraction`.
- Receipt scoring checks transaction and item reconstruction. Statement scoring
  checks statement metadata and line structures.

## Code Ownership

| Area | File | Responsibility |
| --- | --- | --- |
| Statement prompt | `backend/app/prompts/statement/extraction.py` | Statement text/evidence to normalized statement metadata and lines. |
| Statement Gemini agent | `backend/app/agents/statement_extraction.py` | Gemini profile/evidence runners plus explicit prompt-lab direct-PDF debug runner. |
| Statement case discovery | `backend/app/prompt_lab/statement/cases.py` | Private corpus import, PDF inspection, password states, Codex text extraction packets. |
| Statement coalesce | `backend/app/services/statement_coalesce.py` | Shared statement-only normalization for source order, currencies, warnings, and provider metadata. |
| Statement scoring | `backend/app/prompt_lab/statement/scoring.py` | Expected-vs-actual statement line comparison. |
| Statement local reports | `backend/app/prompt_lab/statement/report.py` | Pre-Gemini expected-fixture comparison and read-only reconciliation simulation. |
| Statement Gemini runner | `backend/app/prompt_lab/statement/runner.py` | `statement-run` artifacts, cache use, live-cost boundary, scoring, and reconciliation packet generation. |
| Statement batch report | `backend/app/prompt_lab/statement/batch_report.py` | Batch-level live Gemini analysis and promotion decision. |
| Statement local DB seed | `backend/app/prompt_lab/statement/seed_db.py` | Local SQLite-only seeded receipt transactions for statement reconciliation edge cases. |
| Shared prompt registry | `backend/app/prompts/registry.py` | Looks up both receipt and statement prompt IDs without owning either prompt body. |
| Shared prompt-lab CLI | `backend/app/prompt_lab/cli.py` | Routes receipt commands and statement commands to their dedicated packages. |

## Run Folder Naming

Commands that create prompt-lab run folders generate sortable run IDs when
`--run-id` is omitted:

```text
YYYYMMDDTHHMMSSZ-001-short-label
```

The timestamp makes the newest run sort last across days, and the serial keeps
several runs launched in the same second ordered without overwriting each other.
Pass an explicit `--run-id` only when several commands intentionally need to
write into a known shared evidence folder.

## Privacy Boundary

- Raw credit-card statement PDFs live under `prompt-testing/test-cases/statements/private/`.
- That private folder is gitignored.
- `credentials.json` files are never copied by the importer and are gitignored if an operator
  places local copies beside the PDFs.
- Committed artifacts may include only sanitized metadata: issuer, filename, hash, size,
  page count, encryption status, and whether a password source existed during import.
- Codex text-extraction packets are written under ignored prompt-lab results and may contain
  private statement text.
- Private expected files are named `<case>.expected.json` beside the ignored PDF. They contain
  normalized statement metadata/lines only and remain untracked.
- Normalized statement extraction output does not carry raw PDF text; raw text is limited to
  the prompt-lab-only packet wrapper.

## Corpus Commands

Import the legacy corpus into ignored local storage:

```bash
cd backend
uv run python -m app.prompt_lab statement-import \
  --source /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --force
```

List imported local statement cases:

```bash
cd backend
uv run python -m app.prompt_lab statement-list
```

Run Codex-only PDF text extraction for one issuer sample:

```bash
cd backend
uv run python -m app.prompt_lab statement-extract \
  --case cmr/cmr202503 \
  --run-id 20260525Tstatement-codex-samples
```

For encrypted issuers, provide a local credential source. The command reads only
`<credentials-root>/<issuer>/credentials.json` and never writes the password:

```bash
cd backend
uv run python -m app.prompt_lab statement-extract \
  --case edwards/edw202506 \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --run-id 20260525Tstatement-codex-samples
```

## Current Corpus Snapshot

The first import produced:

- 24 PDFs total.
- 12 CMR PDFs, unencrypted.
- 9 Edwards PDFs, encrypted with local password source.
- 3 Scotiabank PDFs, encrypted with local password source.

The committed manifest is `prompt-testing/test-cases/statements/manifest.json`.

The first private representative expected-baseline pass is local-only:

- `cmr/cmr202503`
- `edwards/edw202506`
- `scotiabank/sco202206`

Use `statement-list --json` to confirm these cases report `baseline_status=baselined` before
running any Gemini statement prompt scoring.

Generate the current local expected-fixture report without running Gemini:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --run-id 20260525-statement-expected-local \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard
```

Generate a mock-Gemini report without calling Gemini:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --actual-source mock-gemini \
  --transaction-fixture edge-cases \
  --run-id 20260525-statement-mock-gemini-local \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard
```

Seed real local SQLite receipt-like transactions for the baselined statement cases:

```bash
cd backend
uv run python -m app.prompt_lab statement-seed-db
```

The seed command is local-only and SQLite-only. It targets the bootstrap
`local-user` ownership scope, deletes only prior rows whose `prompt_version`
starts with `statement-lab-seed:`, and inserts fresh `receipt_type=scan`
transactions covering exact, fuzzy, ambiguous duplicate, receipt-only, and
near-miss receipt-only cases.

Then run the report against those real local rows:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --actual-source mock-gemini \
  --transaction-scope-firebase-uid local-user \
  --run-id 20260525-statement-mock-gemini-seeded-local \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard
```

This writes ignored local evidence under
`prompt-testing/results/latest/statements/<run-id>/`. The report compares the
selected actual output against private expected files, then simulates
reconciliation using that normalized statement output and the local receipt
transaction database. In `mock-gemini` mode, the actual output is a simulated
provider response built from the expected fixture. It is downstream harness
evidence, not provider-quality evidence.

With `--transaction-fixture edge-cases`, the report overlays synthetic in-memory
app transactions for each statement case. It covers exact matches, fuzzy
merchant/date/amount matches, ambiguous duplicate receipt candidates,
application-only receipt transactions, and statement-only transactions. These
fixture transactions are written only to ignored report artifacts; they are not
inserted into the local app database.

With `statement-seed-db` plus `--transaction-scope-firebase-uid local-user`, the
report reads real local SQLite rows instead of the synthetic overlay. This is
still local harness evidence; it does not call Gemini and does not prove the
deployed runtime.

Each statement report run writes:

- Top-level `manifest.json`, `report.json`, and `REPORT.md`.
- Per-case `pdf_text_extraction.json`, `raw_output.json`,
  `processed_output.json`, `field_provenance.json`, `score.json`,
  `reconciliation.json`, `payload_examples.json`, `cost_summary.json`, and
  `manifest.json`.

The report includes outcome counts and example app-facing payloads for matched
transactions, statement-only create candidates, receipt-only app transactions,
ambiguous match resolution, and manual-review lines when present.

The report does not write statement rows, reconciliation rows, raw PDFs,
credentials, or raw statement text.

## Consolidated Approach Suite

Use `statement-suite-run` when comparing PyMuPDF and Gemini for the same case
set. The command writes one sortable run folder with top-level comparison
reports plus one report per approach:

```text
prompt-testing/results/latest/statements/<run-id>/
  REPORT.md
  EXECUTIVE_SUMMARY.md
  report.json
  manifest.json
  approaches/
    pymupdf/
      REPORT.md
      report.json
      cases/<case-id>/
    gemini/
      REPORT.md
      report.json
      cases/<case-id>/
```

Default suite cases are `cmr/cmr202503`, `cmr/cmr202504`, `cmr/cmr202505`,
`edwards/edw202506`, `edwards/edw202507`, `scotiabank/sco202206`, and
`scotiabank/sco202207`. The suite fails before scoring when a requested case
has no private expected fixture.

```bash
cd backend
uv run python -m app.prompt_lab statement-suite-run \
  --case cmr/cmr202503 \
  --case cmr/cmr202504 \
  --case cmr/cmr202505 \
  --case edwards/edw202506 \
  --case edwards/edw202507 \
  --case scotiabank/sco202206 \
  --case scotiabank/sco202207 \
  --approach auto \
  --approach gemini \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --transaction-scope-firebase-uid local-user
```

The command above does not call Gemini. Add `--gemini-live --bypass-cache
--confirm-live-cost` only when intentionally running the live provider lane.

## Deterministic PDF Extraction Spike

Before spending more Gemini calls on text-layer PDFs, run the deterministic CMR
spike. It compares the existing `pypdf` text-only baseline with the layout-aware
`PyMuPDF` parser and writes ignored local artifacts only:

```bash
cd backend
uv run python -m app.prompt_lab statement-deterministic-run \
  --case cmr/cmr202503 \
  --extractor pypdf \
  --extractor pymupdf \
  --transaction-scope-firebase-uid local-user
```

`pypdf` is expected to remain text-only unless text order is sufficient for rows.
`PyMuPDF` groups words by page/y-coordinate, assigns CMR-style columns by
x-coordinate, selects the current cuota/current statement amount column, and keeps
visible alternative amounts as amount candidates.

Each deterministic extractor run writes:

- `pdf_input.json`: sanitized PDF metadata and hashes only.
- `text_layer.json`: text counts and hashes only.
- `layout_words.json`: private word/coordinate evidence for layout debugging.
- `candidate_rows.json`: grouped row candidates, selected columns, and row warnings.
- `processed_output.json`, `field_provenance.json`, `score.json`,
  `reconciliation.json`, `payload_examples.json`, `cost_summary.json`, and
  `manifest.json`.

Generate the no-provider comparison report from deterministic manifests and an
optional prior Gemini manifest:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --actual-source deterministic \
  --deterministic-manifest ../prompt-testing/results/latest/statements/<deterministic-run-id>/cmr-cmr202503/pypdf/manifest.json \
  --deterministic-manifest ../prompt-testing/results/latest/statements/<deterministic-run-id>/cmr-cmr202503/pymupdf/manifest.json \
  --comparison-manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260526-phase4-cmr-amount-evidence-v3-coalesce-correction/cmr-cmr202503/manifest.json \
  --transaction-scope-firebase-uid local-user
```

The first CMR spike produced `pymupdf` as a deterministic primary candidate:
`87/87` normalized lines, `0` amount mismatches, `0` description mismatches,
`0` line-type mismatches, and no Gemini call. The same comparison report keeps
the prior live Gemini manifest visible as non-mutating comparison evidence.

## Phase 4 Gemini Prompt Lab

Phase 4 is the provider-quality gate for statement extraction. It does not
replace runtime `staging-e2e` fixture proof, and prompt-lab does not call Gemini
unless `--live --confirm-live-cost` are both present.

Runtime promotion decision: `auto` remains the promoted provider mode.
Known-layout CMR, Edwards, and Scotiabank statements use deterministic PyMuPDF
first. Unsupported or low-confidence layouts use Gemini fallback in
`profile-rows` mode. Strict fixture scoring remains diagnostic; runtime fallback
promotion uses `fallback_promoted_with_caveats` when date, amount, currency, and
candidate safety pass. Extra-line over-extraction is a caveat when unsafe
transaction candidates are held back.

Gemini fallback cost controls:

- Direct raw-PDF Gemini is prompt-lab/debug only.
- Runtime Gemini fallback uses compact row profile evidence by default.
- Compact evidence v2 provider payload is available as a cost-reduction
  experiment, but it is not promoted as the default provider input until it
  preserves the same P0 date, amount, currency, and candidate-safety results.
  The v2 payload excludes full word lists and raw page text; it sends row index,
  page, visible row text, detected dates, amount tokens, currency hints,
  installment markers, nearby section/header context, and minimal coordinates.
- Statement processing metadata records model, prompt id/version, input mode,
  tokens, estimated cost, fallback reason, cache status, deterministic routing
  reasons, and evidence row counts for internal audit. Normal user-facing
  statement responses do not expose cost fields.
- Reports include deterministic calls avoided, fallback calls made, average
  tokens/cost, highest-cost case, and cost per ledger-ready line.
- Live prompt-lab confirmation uses a conservative statement fallback estimate
  of `160000` input tokens and `5000` output tokens per case. With
  `gemini-2.5-flash-lite` Standard pricing, this displays about `$0.018` per
  statement, or `$0.126` for the current 7-case suite. The validated
  `profile-rows` fallback run measured lower on average: `676109` total tokens
  / `$0.0707678`, about `$0.0101097` per statement and `$0.000229` per
  ledger-ready line.

Latest cost experiment: compact evidence v2 reduced the 7-case fallback
calibration from `676109` total tokens / `$0.0707678` to `296227` total tokens /
`$0.0383257`, but it reintroduced `17` amount mismatches. Therefore v2 is not
the promoted runtime fallback input yet; the promoted fallback remains the
previous compact row profile path with `fallback_promoted_with_caveats`.

Dry-run one statement case and write the artifact skeleton without calling
Gemini:

```bash
cd backend
uv run python -m app.prompt_lab statement-run \
  --case cmr/cmr202503 \
  --run-id 20260525-statement-dry-run
```

Check for an existing cached Gemini result without making a provider call:

```bash
cd backend
uv run python -m app.prompt_lab statement-run \
  --case cmr/cmr202503 \
  --cache-only \
  --run-id 20260525-statement-cache-check
```

Run a no-cache live Gemini pass for one representative case only after the
operator accepts cost:

```bash
cd backend
uv run python -m app.prompt_lab statement-run \
  --case cmr/cmr202503 \
  --live \
  --bypass-cache \
  --confirm-live-cost \
  --transaction-scope-firebase-uid local-user \
  --run-id 20260525-statement-live-representative
```

For encrypted issuers, pass the local legacy credential root. Passwords are read
only from `<credentials-root>/<issuer>/credentials.json`, are never logged, and
decrypted PDFs are kept in memory only:

```bash
cd backend
uv run python -m app.prompt_lab statement-run \
  --case edwards/edw202506 \
  --live \
  --bypass-cache \
  --confirm-live-cost \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --transaction-scope-firebase-uid local-user \
  --run-id 20260525-statement-live-representative
```

Batch-analyze the generated run manifests:

```bash
cd backend
uv run python -m app.prompt_lab statement-batch-report \
  --manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-statement-live-representative/cmr-cmr202503/manifest.json \
  --manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-statement-live-representative/edwards-edw202506/manifest.json \
  --manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-statement-live-representative/scotiabank-sco202206/manifest.json \
  --output-dir ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-statement-live-representative \
  --label representative-3case
```

Generate the same `REPORT.md` / `report.json` style used by mock-Gemini
statement reports from one or more prior live `statement-run` manifests:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --actual-source live-gemini \
  --manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-statement-live-representative/cmr-cmr202503/manifest.json \
  --transaction-scope-firebase-uid local-user \
  --run-id 20260525-statement-live-gemini-report
```

This report does not call Gemini again. It reuses the live manifest's processed
output, scores it against the private expected fixture, reruns local read-only
reconciliation, and writes the mock-style report artifacts under
`prompt-testing/results/latest/statements/<run-id>/`.

The report has a strict quality-diagnostic section so matching line counts do
not look like a pass. `REPORT.md` includes `Why It Failed`, severity counts,
downstream impact, promotion blockers, and top mismatch examples by source
order/pattern. `report.json` carries the same machine-readable fields:
`failure_summary`, `severity_counts`, `downstream_impact`,
`recommended_owner`, and `promotion_blockers`.

When mismatches exist, `REPORT.md` also prints expected-vs-actual values for
the mismatched fields, the value delta, and the transaction context for the
matched statement line. Statement scoring uses deterministic best-match
alignment: expected and processed actual lines are matched one-to-one by
normalized description, date, currency, source-order proximity, line type, and
amount as a tie-breaker before field values are compared. Source-order drift is
kept as a diagnostic so bad provider ordering remains visible without creating
cascading value mismatches.

Each `statement-run` case folder writes:

- `pdf_input.json`: sanitized PDF metadata and hashes only.
- `raw_output.json`: Gemini provider-shaped output, or skipped/error status.
- `processed_output.json`: normalized statement contract after statement coalesce.
- `compact_provider_evidence.json`: compact v2 cost-experiment row evidence
  generated beside the default compact profile evidence.
- `field_provenance.json`: raw-vs-processed attribution without raw text.
- `score.json`: expected-vs-actual statement score and mismatch diagnostics.
- `reconciliation.json`: read-only matched, statement-only, receipt-only, and ambiguous counts.
- `payload_examples.json`: app-facing example payloads for populated buckets.
- `cost_summary.json`: provider token/cost data when a provider call ran.
- `manifest.json`: case-level index, cache key, status, and artifact paths.

Each batch report writes:

- `<label>-statement-live-summary.json`
- `<label>-statement-live-analysis.md`

The batch report records pass/fail, provider errors, cache/no-cache status,
token/cost totals, line count deltas, field mismatch counts, reconciliation
bucket effects, failure ownership, and a promotion decision.

The current fallback product decision accepts Gemini fallback as promoted with
caveats for unsupported readable text-layer statements. This does not make
Gemini primary for known layouts; it makes Gemini the transparent fallback after
deterministic routing or quality gates fail. Coalesce still preserves warnings
and amount-candidate provenance rather than silently hiding extraction risk.

Accepted failure-owner labels are `provider`, `pdf_or_credential`,
`expected_fixture_gap`, `prompt_or_provider`, `prompt_or_coalesce`, and
`not_provider_quality_evidence`.

## Statement Contract

The P5 statement extraction contract lives in `backend/app/schemas/statement.py`.
It separates:

- PDF metadata: issuer, filename, SHA-256, size, page count, encryption status, password-source flag.
- Statement metadata: issuer, period, due date, currency, totals, card alias candidate.
- Statement lines: source order, date, description, amount, currency, type, installment,
  original foreign amount, card alias candidate, category candidate, amount-selection
  reason, and visible amount candidates.
- Processing metadata: provider, prompt/model identity, input mode, token/cost audit fields,
  fallback reason, routing reasons, confidence, text hash, page count, text counts, warnings.
- Future reconciliation verdicts: matched, statement-only, receipt-only, ambiguous, failed.

The contract intentionally excludes PAN, CVV, expiry, card-number fragments, and account
identifiers. User-facing card identity remains alias-only.

## Pre-Gemini Gate

Before Gemini prompt iteration:

1. Import the full private corpus and commit only the sanitized manifest.
2. Extract one representative PDF from each issuer using Codex-only PDF text extraction.
3. Use those private extraction packets to decide which statement fields are valuable,
   which fields are discarded, and how line normalization/coalescing should work.
4. Generate private expected files for the full corpus from Codex/manual extraction.
5. Select a representative Gemini subset and score it with statement-specific scoring,
   not receipt prompt-lab scoring.

## Runtime Statement-Only Transaction Candidates

Reconciliation does not silently create ledger transactions. When a statement
line does not match an existing receipt transaction, the API keeps the verdict as
`statement_only`.

For positive spend-like statement lines, the statement-only bucket also returns a
`candidate_transaction` payload shaped like the transaction create contract:

- `receipt_type: "statement"`.
- `merchant`, `transaction_date`, `total_minor`, and `currency` copied from the
  statement line.
- `gross_total_minor` and `reconstructed_total_minor` equal to the statement
  amount.
- `merchant_source: "ai"` and `store_category_source: "unknown"`.
- One flagged item named `Unidentified statement item` with
  `category_source: "statement_unidentified"`.

The client can present this as an "Add transaction" action. Accepting it posts
the payload to the transaction create API; discarding it does nothing. Payments,
credits, missing-date lines, and non-positive lines do not become spend
candidates.
