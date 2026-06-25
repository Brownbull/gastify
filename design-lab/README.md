# Gastify Design Lab

Storybook-based design workspace for the Gastify design system — atoms, molecules, organisms, screens, and variation spikes.

## Quick Start

```bash
cd design-lab
npm install
npm run storybook
```

Storybook opens at **http://localhost:6008**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run storybook` | Start Storybook dev server (port 6008) |
| `npm run build-storybook` | Build static Storybook site |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run build` | Type-check + Vite production build |
| `npm run test` | Run unit tests (Vitest, jsdom) |
| `npm run test-storybook` | Run Storybook interaction tests (browser-mode Chromium) |
| `npm run generate:tokens` | Regenerate `src/styles/tokens.css` from `shared/design-tokens.ts` |

## Verification Gate

Run all checks before committing design-lab changes:

```bash
npm run typecheck && npm run build && npm run build-storybook && npm run test-storybook
```

## Structure

```
design-lab/
├── public/pixel-icons/       # PixelLab-generated pixel art icons (64×64 PNG)
├── scripts/                  # Token + icon generation scripts
├── src/
│   ├── design-system/
│   │   ├── assets/           # PixelIcon, stroke icon catalog
│   │   ├── atoms/            # Button, Badge, Chip, Input, IconButton
│   │   ├── molecules/        # Card, CategoryChip, CompactRowList, Toast, ...
│   │   ├── organisms/        # AppSurface, AppShell
│   │   └── _spikes/          # Variation spikes (A/B/C/D + Compare)
│   ├── features/             # Screen-level compositions (home/, ...)
│   ├── lib/                  # Shared utilities (categoryTokens, ...)
│   └── styles/               # Tailwind + generated token CSS
└── .storybook/               # Storybook config (main.ts, preview.tsx)
```

## Spike Workflow

Every component tier uses **spike-first iteration** (DM-6): build A/B/C/D variations in the `_spikes/` harness, compare side-by-side, pick a winner, fold into the production component, and archive the spike.
