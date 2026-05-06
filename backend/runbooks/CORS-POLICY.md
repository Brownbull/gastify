# CORS Policy Runbook

Referenced by A.17 §4. Origin allow-list and cross-origin request handling.

## Allowed Origins

| Environment | Origin |
|-------------|--------|
| Production | `https://app.gastify.cl` |
| Staging | `https://staging.gastify.cl` |
| Development | `http://localhost:5174` |

Configured via `GASTIFY_CORS_ORIGINS` env var (comma-separated list).

## Auth Posture

Bearer-only authentication (no cookies). CSRF is not a concern under Bearer-only. If cookie auth ever lands, this must be revisited.

## SSE Origin Handshake

`/v1/scans/$scanId/events` validates `Origin` header against allow-list at handshake time:
1. Check `Origin` against allow-list → `403 errors/auth.forbidden` on mismatch (BEFORE opening stream)
2. Validate `ownership_scope_id` matches scope of requested `scanId` (defense-in-depth via RLS)

## WebSocket Origin Check

Same allow-list validation as SSE. Applied at WebSocket upgrade handshake.

## CORS Headers

```
Access-Control-Allow-Origin: <matched origin>
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key, X-Request-Id
Access-Control-Expose-Headers: Retry-After, X-Request-Id, Cache-Tags
Access-Control-Max-Age: 86400
```

## Implementation Status

- [x] Basic CORS middleware in `app/main.py`
- [ ] SSE origin handshake validation
- [ ] WebSocket origin handshake validation
- [ ] `Cache-Tags` in `Access-Control-Expose-Headers`
