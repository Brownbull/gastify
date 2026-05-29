# Incident Response Playbook

> Detection → triage → mitigation → post-mortem for the most likely Gastify incidents.
> Observability: `/api/v1/metrics` (X-Metrics-Key) + structlog JSON (request_id correlation).

## Severity ladder
- **SEV1** — data breach / cross-tenant leak / data loss. Page immediately.
- **SEV2** — core flow down (scan, auth, ledger) for many users.
- **SEV3** — degraded (elevated errors/latency, one surface).

## Scenario: extraction-LLM quota exhaustion
- **Detect:** `scan_error_quota_exceeded` + `scans_queued` rising on `/metrics`; scans landing in `queued` state.
- **Expected behavior:** graceful degradation — scans enter `QUEUED` (no 5xx), retriable. NOT an outage by itself.
- **Mitigate:** confirm the paid Gemini tier/quota; once quota recovers, run the requeue sweep (`requeue_quota_throttled_scans`) or `POST /scans/{id}/process` to re-dispatch. Raise the quota or throttle intake if sustained.
- **Escalate:** SEV2 if the queue grows unbounded or quota cannot be restored.

## Scenario: suspected cross-tenant data exposure (SEV1)
- **Detect:** report of seeing another scope's data; anomalous access patterns.
- **Mitigate:** the DB enforces RLS (FORCE) keyed on `app.ownership_scope_id` + app-layer `ownership_scope_id` filters. Capture the request_id, identify the endpoint, verify the scope binding in `auth.deps`. If a real leak, disable the affected endpoint, rotate sessions, begin breach-notification clocks (GDPR 72h).
- **Post:** add a regression isolation test before re-enabling.

## Scenario: consent abuse / mis-grant
- **Detect:** `audit_event_consent_*` anomalies; user dispute.
- **Mitigate:** consent is per-purpose + audit-logged with ip/ua + `withdrawn_at`. Reconstruct the timeline from `audit_events`; revoke if mis-granted (propagates to cohort/AI exclusion).

## Scenario: data-loss from retention misfire
- **Prevent:** `run_retention.py` defaults to dry-run; `--apply` only deletes transient scan jobs + audit events past TTL, NEVER transactions.
- **If misfired:** restore from snapshot (see DISASTER-RECOVERY.md); transactions are unaffected by retention.

## Standard loop
1. Declare severity + open an incident channel; assign an IC.
2. Mitigate first (stop the bleeding), diagnose second.
3. Use request_id to correlate logs ↔ metrics ↔ audit events.
4. Communicate status on cadence; for SEV1 with personal-data impact, start the regulatory notification clock.
5. Post-mortem within 5 business days: timeline, root cause, action items (tracked in PENDING / DECISIONS).

## Deferred (operational)
- Live incident drill + on-call rotation wiring — launch staging session.
