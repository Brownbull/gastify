# AGENTS.md — Settings + Onboarding + Profile

Learnings from RALPH iterations on the Settings feature.

## Phase A Seed

- [2026-05-04] Settings uses nested routes under `/settings/` — 10 sub-pages (profile, preferences, scanning, limits, subscription, data, groups, app, account).
- [2026-05-04] Settings mutations (profile update, preference change) use optimistic updates per DATA-FETCHING.md convention.
- [2026-05-04] Onboarding is a multi-step flow (step-1 through step-3 + complete) — linear progression, no back-navigation between steps.
- [2026-05-04] Feature flags (12 initial flags) gated via `useFeatureFlag(name)` hook — documented in `docs/rebuild/FEATURE-FLAGS.md`.
- [2026-05-04] Data export in Settings uses `window.print()` semantics (not html2canvas/jspdf) per R51.

## Stuck Stories
(none yet)
