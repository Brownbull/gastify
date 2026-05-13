<!-- gabe-review-live:1.1 -->
---
sources:
  - cli: codex
    model: gpt-5
    timestamp: 2026-05-13T19:24:00-04:00
    findings: 3
  - cli: claude
    model: claude-opus-4-6
    timestamp: 2026-05-13T22:00:00-04:00
    findings: 4
consolidated_at: 2026-05-13T22:00:00-04:00
consolidation: union
project_root: /home/khujta/projects/apps/gastify
target: P3 Phase 4 committed scope from PLAN/LEDGER (00c00e6 feature commit; fa17870/08b1848 bookkeeping)
maturity: mvp
status: resolved
---

# Gabe Review — Live Document

**Verdict:** APPROVE
**Confidence:** 90/100
**Coverage:** MEDIUM
**Findings:** 4 (CRITICAL: 0, HIGH: 3, MEDIUM: 0, LOW: 1) | **Sources:** codex+claude
**Resolution:** 4/0/0 of 4 (pending: 0)

## Findings

| # | Status | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Maturity Gate | Escalation | Sources |
|---|--------|----------|---------|------|-------|----------|------------|---------------|------------|---------|
| 1 | fixed | HIGH | Multi-tab logout rebroadcast loop: storage-event handler calls `clearClientSession({ preserveBroadcastMarker: true })` which clears localStorage then writes the marker back. That write fires a new storage event in the other tab, creating an infinite ping-pong between tabs. | `web/src/lib/sessionIsolation.ts:23` | ✅ STABLE | S | LOGOUT EVENT STORM — P(high), I(high) | MVP | - | codex, claude |
| 2 | fixed | HIGH | Locale state is component-local. `useI18n()` uses `useState` per caller; changing locale in Sidebar does not propagate to MobileHeader, MobileNav, or route components until remount/reload. Results in mixed-language portal. | `web/src/hooks/useI18n.ts:10` | ✅ STABLE | M | MIXED-LANGUAGE PORTAL — P(high), I(moderate) | MVP | - | codex, claude |
| 3 | fixed | HIGH | AuthProvider session-invalidation branches untested. Storage-event logout path, explicit `signOut()` cleanup+broadcast, and token-refresh expiry catch branch have no component/hook tests. Only helper-level tests exist (sessionIsolation, i18n). Extends P22 scope. | `web/src/hooks/useAuth.tsx:65` | ✅ STABLE | M | UNTESTED SESSION EVICTION — P(medium), I(high) | Enterprise | P22 related | codex, claude |
| 4 | fixed | LOW | Sign-in button uses hardcoded `hover:bg-gray-50` instead of CSS variable theme token. Inconsistent with rest of app (which uses `var(--primary-light)` etc.). Will show light-gray hover on dark theme surfaces. | `web/src/routes/sign-in.tsx:74` | ✅ STABLE | S | THEME INCONSISTENCY — P(low), I(low) | Enterprise | - | claude |

## Fixes Applied

- **#1** `sessionIsolation.ts`: Replaced `localStorage.clear()` + marker re-write with selective key removal (iterate backwards, skip broadcast marker key). Eliminates the storage event that caused the cross-tab ping-pong.
- **#2** `uiStore.ts` + `useI18n.ts`: Lifted locale state from per-component `useState` into Zustand `useUiStore`. All components now share a single reactive locale slice. `setLocale` writes to localStorage AND updates the store atomically.
- **#3** `useAuth.test.tsx`: 5 new tests covering explicit signOut (happy + error), storage-event sign-out from another tab, non-broadcast event filtering, and token-refresh expiry. Also fixed `signOut()` to swallow Firebase errors (was `try/finally` without `catch`, causing unhandled rejection).
- **#4** `sign-in.tsx`: Changed `hover:bg-gray-50` to `hover:bg-(--primary-light)` to match theme token system.

## Bonus fixes

- **Test setup** `test/setup.ts`: Added localStorage/sessionStorage polyfill for Node.js 22+ environments where `--localstorage-file` flag corrupts JSDOM's Storage (pre-existing issue — all localStorage tests were failing).
- **i18n.ts**: Added try/catch around localStorage access in `getPreferredLocale` and `setPreferredLocale` for environments where Storage methods throw.

## Plan Alignment (5a)

ALIGNED — Phase 4 is the active plan row (Exec=✅, Review=⬜). Scope is sign-out eviction, multi-tab logout broadcast, responsive layout, i18n baseline. Feature commit `00c00e6` touches expected web auth/session/i18n/layout/store files.

## Stale Verified Topics (5c)

None. G6 Web Portal has 0 verified topics.

## Architectural Decisions (5b)

None proposed. D36 already records the Phase 4 storage-event decision.

## Tier Drift (5d)

None detected. Phase 4 declared `ent`; `storage` event pattern is within D36.

## Deferred Backlog Status

- P22 (auth boundary tests): RESOLVED by finding #3 fix — 5 AuthProvider tests now cover the session-invalidation branches P22 was tracking.
- Backend P16-P21, P23: outside Phase 4 web scope.
