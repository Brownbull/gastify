# AGENTS.md — Analytics (Trends)

Learnings from RALPH iterations on the Trends feature.

## Phase A Seed

- [2026-05-04] Trends route at `/trends` with search params: `period`, `category`, `view` (treemap|donut|sankey|bump|radar), `compare`.
- [2026-05-04] Charts use ECharts via `echarts-for-react`. Stories MUST set `animation: false` (handled by global Storybook decorator).
- [2026-05-04] Trends has 5 chart view variants (treemap, donut, sankey, bump, radar) — each is a separate screen-state story.
- [2026-05-04] Drill-down from treemap-leaf → History is `human-authored` (cross-feature interactivity).
- [2026-05-04] Reference exemplar at `docs/rebuild/ux/reference-stories/TrendsView.stories.tsx` — chart variant patterns.
- [2026-05-04] Chart-ready assertions in play() must use `waitFor` to ensure ECharts canvas renders before interacting.

## Stuck Stories
(none yet)
