# AGENTS.md — Atoms + Molecules

Learnings from RALPH iterations on shared UI primitives.

## Phase A Seed

- [2026-05-04] Storybook 10.3.5 uses `@storybook/addon-vitest` for test runner (NOT `@storybook/test-runner` which is SB8-only). Import `storybookTest` from `@storybook/addon-vitest/vitest-plugin`.
- [2026-05-04] Vitest workspace at `frontend/vitest.workspace.ts` has two projects: `unit` (jsdom) and `storybook` (browser/playwright). Run storybook tests with `npx vitest run --project storybook`.
- [2026-05-04] Design tokens live in `frontend/src/styles/global.css` as CSS custom properties. Use `var(--color-*)`, `var(--spacing-*)`, etc.
- [2026-05-04] All user-visible strings must come from `frontend/src/locales/es-CL.json`. Never inline Spanish text.
- [2026-05-04] Three a11y violations in baseline: `aria-required-children` (critical), `color-contrast` (serious, 15 nodes), `nested-interactive` (serious, 6 nodes). New components must not introduce these.
- [2026-05-04] Storybook preview decorators set `ECharts animation: false` and `framer-motion skipAnimations` for deterministic test rendering.

## Stuck Stories
(none yet)
