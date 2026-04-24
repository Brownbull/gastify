# Explorations — Status: Superseded

**Status:** empty by design · **Decision:** DECISIONS.md D20 (2026-04-24)

## What this folder was for

Phase 1 plan specified Task T5: render 6 candidate themes × 4 stress screens × 3 platforms = 72 HTML files via frontend-design skill (or MVS subset of 18 — Dashboard × 3 platforms × 6 themes).

See `../STRESS-TEST-SPEC.md` for the full matrix, platform frame conventions, and state matrix that T5 was meant to fill.

## What happened instead

Phase 1 built **14 production desktop variants** directly, using the locked tokens from the 6 style prompts:

```
screens/gastify-dashboard-desktop.html
screens/gastify-history-desktop.html
screens/gastify-trends-desktop.html
screens/gastify-settings-desktop.html
screens/gastify-transaction-editor-desktop.html
screens/gastify-insights-desktop.html
screens/gastify-reports-desktop.html
screens/gastify-items-desktop.html
screens/gastify-scan-mode-selector-desktop.html
screens/gastify-single-scan-states-desktop.html
screens/gastify-quicksave-card-desktop.html
screens/gastify-group-hub-desktop.html
screens/gastify-auth-desktop.html
screens/gastify-consent-desktop.html
```

Each one renders with `data-theme="normal|professional|mono"` + `data-mode="light|dark"` = 6 runtime variants.

## Why the supersession is stronger evidence

Stress-test renders validate tokens under **synthetic** constraints. Production surfaces validate tokens under **real** constraints: actual data density (14-col tables, nested L1-L4 breakdowns), actual responsive grids (240+1fr+340 sidebar-rail split at 1440 / 1280 drop-rail / 1024 collapse-sidebar / 640 mobile fallback), actual component composition (filter strips, modals, split panels, accordions, timelines).

If the tokens hold across 14 shipped production screens, they hold. Exploratory renders would have told us less.

## When to revisit

Per D20 review trigger: if theme count changes, or if token structure breaks a production surface, regenerate targeted renders for the affected surface. Do NOT backfill the original 72 — sunk cost.

## Contents

```
output/   # empty — was destination for frontend-design skill drops
```
