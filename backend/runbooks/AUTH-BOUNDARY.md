# Auth Boundary Runbook

Referenced by A.17 §1. Operational details for Firebase Auth token verification.

## Token Verification

Every authenticated FastAPI endpoint uses the `CurrentUser` dependency (`app/auth/firebase.py`). Verification flow:

1. Extract `Bearer` token from `Authorization` header
2. Firebase Admin SDK `verify_id_token(token)` with cached JWKS
3. On success: return `FirebaseUser(uid, email, name)`
4. On failure: `401 errors/auth.unauthenticated`

## JIT User Provisioning

On first authenticated request where `users.firebase_uid` doesn't exist:

```sql
BEGIN;
  INSERT INTO users (firebase_uid, email, display_name) VALUES (...) ON CONFLICT (firebase_uid) DO NOTHING;
  INSERT INTO ownership_scope (owner_user_id) SELECT id FROM users WHERE firebase_uid = ... ON CONFLICT DO NOTHING;
  INSERT INTO ownership_scope_members (ownership_scope_id, user_id) SELECT ... ON CONFLICT DO NOTHING;
COMMIT;
```

Single transaction; uniqueness constraint on `firebase_uid` makes it idempotent.

## JWKS Cache Policy

- TTL: 1 hour max
- Force-refresh: unknown `kid` triggers ONE re-fetch (rate-limited 1/min/process)
- Failed refresh (kid still unknown): reject with `errors/auth.unauthenticated`

## Streaming Token Revalidation

- SSE/WS connections re-validate Bearer every 5 minutes
- On token revocation: structured close frame
- Mobile WS: reconnect with fresh `getIdToken(forceRefresh=true)`

## Implementation Status

- [x] Basic Firebase token verification (`app/auth/firebase.py`)
- [ ] JWKS cache with TTL + force-refresh on unknown `kid`
- [ ] JIT provisioning transaction
- [ ] Streaming token revalidation middleware
- [ ] Integration test: expired token returns 401
- [ ] Integration test: unknown `kid` triggers refresh then rejects
