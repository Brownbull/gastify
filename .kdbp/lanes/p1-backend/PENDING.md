# Deferred Items — p1-backend lane

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| P1 | 2026-04-23 | gabe-plan (D3) | CSRF escalation trigger: if cookie-based session is introduced (e.g., HTTP-only cookie for refresh-token XSS defense), Auth.CSRF must escalate from MVP `none` to Ent double-submit token. Bearer-only API currently immune. | .kdbp/DECISIONS.md#D3 | mvp | medium | high | 0 | open |
| P2 | 2026-04-23 | gabe-plan (D2) | FX backfill escalation trigger: if any code path adds UPDATE to `fx_rates` (e.g., statement-reconciliation backfill of corrected rates), structural PK+ON-CONFLICT idempotency breaks down. Escalate BG-jobs.Idempotency to Ent (job-ID dedupe Option B) before merging the UPDATE path. | .kdbp/DECISIONS.md#D2 | mvp | medium | medium | 0 | open |
