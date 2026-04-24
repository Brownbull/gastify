# Deferred Items

| # | Date | Source | Finding | File | Scale | Priority | Impact | Times Deferred | Status |
|---|------|--------|---------|------|-------|----------|--------|----------------|--------|
| P1 | 2026-04-24 | gabe-review | Phase 1 built Phase 5-11 production desktop surfaces early (Insights, Reports, Items, Scan×3, Group Hub, Auth, Consent) — scope drift from stated P1 exit artifacts. May conflict with P2-P3 atomic component crystallization | `docs/mockups/screens/*-desktop.html` | mvp | medium | moderate | 1 | open |
| P2 | 2026-04-24 | gabe-review | Style prompts shipped = 6 (mono/normal/organic/playful-geometric/professional/sketch). PLAN called for 6 legacy + 3 new = 9. No DECISIONS entry logging the trim | `docs/mockups/styles/*.prompt` | mvp | medium | low | 1 | open |
| P3 | 2026-04-24 | gabe-review | No WCAG AA a11y audit artifact for Phase 1 — 14 desktop screens × 6 theme×mode runtime variants lack contrast / focus / ARIA validation. Phase 13 audit gate will catch but fix multiplies | `docs/mockups/design-system.html` | mvp | low | moderate | 1 | open |
| P4 | 2026-04-24 | gabe-review | `piggy-bank.png` lives at `docs/mockups/screens/piggy-bank.png` — asset in screens/ folder instead of `assets/icons/` or `assets/raster/`. Minor organization drift | `docs/mockups/screens/piggy-bank.png` | mvp | low | negligible | 1 | open |

<!-- P1-P4 from /gabe-review Phase 1 (2026-04-24) — see LEDGER for review trace -->
<!-- Backend P1 pending items are tracked inside .kdbp/archive/queued_backend-p1.md and activate with that plan. -->
