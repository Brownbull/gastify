# Receipt Prompt Lab

Backend-native lab for receipt scanning prompt work. The production scan agents and this lab
read prompt definitions through `backend/app/prompts/registry.py`, so prompt iteration does not
drift from the deployed pipeline.

For the full end-to-end map of runtime scan stages, prompt-lab stages, artifact files, and field
ownership, see `prompt-testing/RECEIPT-PIPELINE.md`.

Prompt-lab commands that create run folders now generate sortable run IDs when
`--run-id` is omitted:

```text
YYYYMMDDTHHMMSSZ-001-short-label
```

That keeps the newest generated run last in normal lexicographic folder sorting,
while still allowing an explicit `--run-id` when several commands must write
into the same known evidence folder.

Prompt files are split by responsibility:

- `backend/app/prompts/receipt/extraction.py`: receipt image to structured extraction prompt.
- `backend/app/prompts/receipt/item_categorization.py`: extracted item text to V4 category prompt.
- `backend/app/prompts/receipt/store_categorization.py`: merchant text to V4 store category prompt.
- `backend/app/prompts/statement/extraction.py`: statement PDF/text to structured statement-line prompt.
- `backend/app/prompts/values.py`: reusable prompt value lists such as supported currencies and
  V4 category keys/taxonomy text.
- `backend/app/prompts/registry.py`: thin lookup/index for configured prompt IDs.
- `backend/app/reference/categories.py`: canonical English PascalCase category keys plus
  locale display labels. Spanish is translation metadata, not a category identifier.

## Statement Prompt Lab

P5 statement reconciliation uses a separate statement lane. Do not import credit-card
statements into the receipt corpus.

- Private PDFs live in `prompt-testing/test-cases/statements/private/` and are gitignored.
- The committed statement manifest is `prompt-testing/test-cases/statements/manifest.json`.
- The statement pipeline and commands are documented in `prompt-testing/STATEMENT-PIPELINE.md`.
- Statement schemas live in `backend/app/schemas/statement.py`.
- Statement prompt definitions use prompt kind `statement-extraction`.
- Statement prompt-lab code lives under `backend/app/prompt_lab/statement/`.
- Private `.expected.json` files are created beside the ignored PDFs before Gemini scoring.

Import the local legacy statement corpus:

```bash
cd backend
uv run python -m app.prompt_lab statement-import \
  --source /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --force
```

Run a Codex-only sample extraction:

```bash
cd backend
uv run python -m app.prompt_lab statement-extract \
  --case cmr/cmr202503
```

Check representative expected-baseline coverage before Gemini iteration:

```bash
cd backend
uv run python -m app.prompt_lab statement-list --json
```

Generate the current pre-Gemini expected-fixture report:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard
```

Generate a mock-Gemini report without calling Gemini:

```bash
cd backend
uv run python -m app.prompt_lab statement-report \
  --actual-source mock-gemini \
  --transaction-fixture edge-cases \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard
```

Run the consolidated four-case approach suite. Omit `--gemini-live` while
checking layout or cached evidence only; add `--gemini-live --confirm-live-cost`
for a real provider comparison.

```bash
cd backend
uv run python -m app.prompt_lab statement-suite-run \
  --case cmr/cmr202503 \
  --case cmr/cmr202504 \
  --case edwards/edw202506 \
  --case scotiabank/sco202206 \
  --approach pymupdf \
  --approach gemini \
  --credentials-root /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases/CreditCard \
  --transaction-scope-firebase-uid local-user
```

## Evidence Boundary

Prompt-lab runs are AI-quality evidence only. They do not replace S23 gallery/camera proof in
`staging-e2e` or the live Gemini smoke in `staging`.

The 14-case baseline set lives at `prompt-testing/baselines/receipt-baseline-set-v1.json`.
Its coverage tags and `receipt-extraction-promotion-v1` threshold are the promotion contract:
all 14 cases must be no-cache/provider-clean, `significant_failure` must be zero, threshold
failures must be classified, and production promotion still requires the separate staging/S23
runtime evidence.

## Commands

Import the curated legacy receipt corpus:

```bash
cd backend
uv run python -m app.prompt_lab import-legacy \
  --source /home/khujta/projects/bmad/boletapp/prompt-testing/test-cases \
  --force
```

Validate adapted baselines:

```bash
cd backend
uv run python -m app.prompt_lab validate
```

Render a prompt and hash:

```bash
cd backend
uv run python -m app.prompt_lab render --prompt receipt-extraction-current
```

Dry-run a case without Gemini:

```bash
cd backend
uv run python -m app.prompt_lab run --case supermarket/super_lider --limit 1
```

Live runs are opt-in and cost guarded:

```bash
cd backend
uv run python -m app.prompt_lab run \
  --case supermarket/super_lider \
  --live \
  --limit 1 \
  --confirm-live-cost
```

The prompt-lab CLI auto-loads ignored backend env files before settings are created:

- fully loads `backend/.env` and `backend/.env.local` when present;
- if `GOOGLE_API_KEY` is still unset, loads only `GOOGLE_API_KEY` from
  `backend/.env.staging` or `backend/.env.staging-e2e`;
- never auto-loads `backend/.env.production`.

For a full explicit env file, set:

```bash
GASTIFY_PROMPT_LAB_ENV_FILE=backend/.env.staging \
  uv run python -m app.prompt_lab run --case supermarket/super_lider --live --limit 1 --confirm-live-cost
```

Ignored files may contain real API keys. Do not copy secrets into `*.example` files or committed
prompt results.

Live prompt-lab calls use the same provider retry semantics intended for the
application path: transient provider overload such as Gemini `503 UNAVAILABLE`
is retried with exponential backoff, while quota, auth, blocked-key, and bad
request failures stay visible as failures.

Default image handling uses the same `compress_receipt_image` path as backend uploads.
`--raw-image` is available only for diagnosis and is labeled non-runtime-equivalent in manifests.
