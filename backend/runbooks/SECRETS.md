# Secret Management Runbook

Referenced by A.17 §5. Secret inventory, rotation cadences, and CI enforcement.

## Secret Inventory

| Secret | Env Var | Rotation | Owner | Notes |
|--------|---------|----------|-------|-------|
| Firebase Admin SDK JSON | `GASTIFY_FIREBASE_CREDENTIALS_PATH` | Yearly / on compromise | Backend deploy | Service-account key file |
| Gemini API key | `GASTIFY_GEMINI_API_KEY` | Quarterly | Backend deploy | NEVER reaches frontend (R14) |
| DB password | `GASTIFY_DATABASE_URL` | PaaS-managed / staff change | Railway | Embedded in connection string |
| FX provider key | `GASTIFY_FX_API_KEY` | Yearly | Backend deploy | |
| Transactional email key | `GASTIFY_EMAIL_API_KEY` | Yearly | Backend deploy | |
| Erasure HMAC key | `GASTIFY_ERASURE_HMAC_KEY` | Never (long-lived, distinct from user salts) | Backend deploy | Per A.17 §6 |

## CI Enforcement

1. **gitleaks / trufflehog** — scans every PR commit for secret-shaped strings
2. **Frontend bundle check** — `VITE_*` env vars must NOT match `_KEY` / `_SECRET` / `_PASSWORD` patterns
3. **Lockfile approval** — diffs to `uv.lock` / `package-lock.json` require explicit reviewer approval

## Environment Segregation

Separate secret sets for dev / staging / prod per A.18 CI/CD pipeline + A.21 staging provisioning.

## Rotation Procedure

1. Generate new secret value
2. Update PaaS secret store (Railway / GitHub Actions)
3. Deploy backend with new value
4. Verify health endpoint returns OK
5. Revoke old secret value
6. Log rotation in `audit_events` (operator + rotation reason)

## Implementation Status

- [x] `.env.example` documents all GASTIFY_* vars
- [ ] gitleaks pre-commit hook
- [ ] Frontend bundle secret-leak check in CI
- [ ] Rotation audit logging
