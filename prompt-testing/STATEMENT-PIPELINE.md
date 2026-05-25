# Statement Prompt Lab Pipeline

P5 statement reconciliation starts with a private statement-corpus lane before any
runtime database or UI work.

## Privacy Boundary

- Raw credit-card statement PDFs live under `prompt-testing/test-cases/statements/private/`.
- That private folder is gitignored.
- `credentials.json` files are never copied by the importer and are gitignored if an operator
  places local copies beside the PDFs.
- Committed artifacts may include only sanitized metadata: issuer, filename, hash, size,
  page count, encryption status, and whether a password source existed during import.
- Codex text-extraction packets are written under ignored prompt-lab results and may contain
  private statement text.
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

## Statement Contract

The P5 statement extraction contract lives in `backend/app/schemas/statement.py`.
It separates:

- PDF metadata: issuer, filename, SHA-256, size, page count, encryption status, password-source flag.
- Statement metadata: issuer, period, due date, currency, totals, card alias candidate.
- Statement lines: source order, date, description, amount, currency, type, installment,
  original foreign amount, card alias candidate, category candidate.
- Processing metadata: provider, prompt/model identity, confidence, text hash, page count,
  text counts, warnings.
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
