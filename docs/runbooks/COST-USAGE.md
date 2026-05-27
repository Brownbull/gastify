# Cost Usage

Use this runbook to fetch on-demand Gemini cost estimates and Railway resource
usage without exposing API keys or database URLs.

## Command

```bash
cd backend
uv run python ../scripts/ops/cost_snapshot.py --since 24h
```

For automation:

```bash
cd backend
uv run python ../scripts/ops/cost_snapshot.py --since 24h --json
```

The JSON schema has these top-level keys:

- `generated_at`
- `window`
- `gemini_app_estimate`
- `gemini_billing`
- `railway_metrics`
- `warnings`

## What It Reads

The default command works now and uses app-visible evidence:

- prompt-lab `cost_summary.json` files under
  `prompt-testing/results/latest/local/**`;
- statement prompt-lab `cost_summary.json` files under
  `prompt-testing/results/latest/statements/**` are currently analyzed
  separately until `cost_snapshot.py` grows a statement-result source;
- deployed Railway Postgres `transactions.llm_tokens_in`,
  `transactions.llm_tokens_out`, and `transactions.llm_cost_usd`, queried with
  `railway run` against the Postgres services;
- Railway service metrics from `railway metrics --all --json`.

These are provider-reported-token estimates, not a replacement for the Google
billing ledger. They are the fastest way to see whether app usage is drifting.

## Railway CLI

Install or update the user-local Railway CLI:

```bash
npx -y @railway/cli@latest upgrade --check
npx -y @railway/cli@latest upgrade --yes
npm install -g @railway/cli@latest
railway --version
railway metrics --all --environment staging --since 24h --json
```

Expected current behavior: `railway --version` should report a CLI with the
`metrics` command. If an older system binary is first on PATH, the script falls
back to:

```bash
npx -y @railway/cli@latest metrics --all --environment staging --since 24h --json
```

## Exact Google Billing

Exact billed Gemini spend requires Cloud Billing export to BigQuery. The export
is not retroactive for periods before it was enabled, and billing export data can
lag real-time app activity.

## Local gcloud Setup For Billing Drilldown

Use this when the local estimate and Google AI Studio spend need to be
reconciled. The target project for the current staging evidence is
`gastify-staging`.

```bash
gcloud init
gcloud auth login
gcloud config set project gastify-staging
gcloud auth application-default login
gcloud auth list
gcloud config get-value project
```

Required access:

- Project viewer access to `gastify-staging`.
- Billing account viewer access for the billing account attached to the project.
- BigQuery job user access on the project used to query the billing export.
- BigQuery data viewer access on the dataset that stores Cloud Billing export.

After access is configured, enable Cloud Billing export to BigQuery from the
Google Cloud console. The dataset project should be linked to the same billing
account being analyzed. Record the generated table name, usually shaped like:

```text
<billing-project>.<dataset>.gcp_billing_export_v1_<billing_account_id>
```

Then run:

```bash
cd backend
uv run python ../scripts/ops/cost_snapshot.py \
  --since 7d \
  --google-billing-table <billing-project.dataset.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX> \
  --google-billing-filter-regex "(gemini|generative ai)"
```

Notes:

- Google AI Studio spend is Gemini API spend, not Firestore spend.
- Cloud Billing export is the authoritative billed-cost source, but it may lag
  the live AI Studio chart.
- Local `cost_summary.json` totals are provider-reported token estimates. They
  are useful for attribution by run/prompt/case, but they are not the billing
  ledger.

Install Google Cloud CLI only when exact billed cost is needed:

```bash
# Debian/Ubuntu path from Google Cloud SDK docs.
sudo apt-get update
sudo apt-get install apt-transport-https ca-certificates gnupg curl
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
  | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get update
sudo apt-get install google-cloud-cli
```

Then authenticate and select the billing project:

```bash
gcloud init
gcloud auth application-default login
gcloud config get-value project
```

After Cloud Billing export to BigQuery is enabled, run:

```bash
cd backend
uv run python ../scripts/ops/cost_snapshot.py \
  --since 7d \
  --google-billing-table <billing-project.dataset.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX>
```

Optional:

```bash
--google-billing-project <billing-query-project>
--google-billing-filter-regex "(gemini|generative ai)"
```

## Dependency

Exact Google billing mode uses `google-cloud-bigquery`, kept in the backend dev
dependency group so production runtime dependencies stay unchanged. The default
estimate and Railway modes do not require it.

## Secret Handling

- Do not print `GOOGLE_API_KEY`, `GASTIFY_DATABASE_URL`, `DATABASE_PUBLIC_URL`,
  Firebase credentials, or billing credentials.
- Keep Google credentials in Application Default Credentials from
  `gcloud auth application-default login`.
- Keep Railway credentials in the Railway CLI login store.
- If the command fails, report the failing source and exit code, not raw secret
  bearing environment values.

## References

- Railway CLI: <https://docs.railway.com/cli>
- Railway metrics: <https://docs.railway.com/cli/metrics>
- Gemini pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Google Cloud CLI install: <https://cloud.google.com/sdk/docs/install>
- Cloud Billing export to BigQuery:
  <https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery>
