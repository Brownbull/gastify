# Story authoring conventions (Storybook 10)

> Phase 3 of the pivot, rewritten after pivot 2A→2B (DECISIONS.md D25). Plan: `~/.claude/plans/okay-here-s-something-that-ancient-graham.md`.

## File placement

Stories live next to their component:

```
src/components/transactions/TransactionCard.tsx
src/components/transactions/TransactionCard.stories.tsx   ← here
```

Glob: `src/**/*.stories.@(ts|tsx|mdx)` (configured in `.storybook/main.ts`).

Showcase stories without a source component (Colors / Typography / Icons design-token references) live under `src/_design/`.

## File format (CSF3)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TransactionCard } from './TransactionCard';

const meta: Meta<typeof TransactionCard> = {
  title: 'Molecules/Transaction Card',
  component: TransactionCard,
};

export default meta;
type Story = StoryObj<typeof TransactionCard>;

export const Default: Story = {
  args: {
    merchant: 'Jumbo Costanera Center',
    amount: 24890,
    currency: 'CLP',
    date: new Date('2026-04-28'),
    itemCount: 3,
  },
};

export const Foreign: Story = {
  args: {
    merchant: 'Whole Foods Market',
    amount: 48.50,
    currency: 'USD',
    date: new Date('2026-04-21'),
    itemCount: 5,
  },
};
```

For showcase stories without a component, use `StoryFn`:

```tsx
import type { Meta, StoryFn } from '@storybook/react-vite';

const meta: Meta = { title: 'Atoms/Colors' };
export default meta;

export const Palette: StoryFn = () => (
  <div className="p-6">…</div>
);
```

The `title` field controls the sidebar tree. Use `/` to nest:

| Title | Sidebar location |
|-------|------------------|
| `Atoms/Button` | Atoms → Button |
| `Molecules/Transaction Card` | Molecules → Transaction Card |
| `Organisms/Top Bar` | Organisms → Top Bar |
| `Templates/Mobile Shell` | Templates → Mobile Shell |
| `Screens/Dashboard` | Screens → Dashboard |
| `Flows/Scan/01-Capture` | Flows → Scan → 01-Capture |

For flows, prefix step name with `NN-` so alphabetical order matches step order.

## Story exports

- **One named export per visual variant.** Default, hover, disabled, error, empty.
- Variant names: `Default`, `WithIcon`, `Loading`, `Empty`, `Error`, `LowConfidence` — describe the *state*, not the prop.
- The default export is metadata only (the `meta` object).

## Args + controls

For data-driven variants, expose `args`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    variant: {
      options: ['primary', 'secondary', 'ghost'],
      control: { type: 'select' },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {
  args: {
    label: 'Save changes',
    variant: 'primary',
    disabled: false,
  },
};
```

Storybook's controls panel auto-renders these — that's the "swap props at runtime" interaction.

## Toolbar globals

`.storybook/preview.tsx` defines two globals:

- **theme** (light/dark) — built-in via `@storybook/addon-themes`. Toggles a `.dark` class on the story container, which the project CSS uses for dark variants.
- **colorTheme** (normal / professional / mono) — custom global; sets `data-theme=` on the wrapper div. Falls back to `normal` until users pick from the toolbar.

Both are global (not per-story); no setup needed in story files.

## Tags (forward-looking for STORIES-INDEX.md)

Phase 6.8 introduces `STORIES-INDEX.md` with REQ + CRUD coverage. Use `tags`:

```tsx
const meta: Meta = {
  title: 'Screens/Dashboard',
  tags: ['REQ-1', 'REQ-7', 'crud:Transaction.Read', 'flow:Scan'],
};
```

The generator (`scripts/build_stories_index.ts`, deferred until manual maintenance becomes painful) walks story files, collects tags, and emits the matrix tables.

## Production isolation

Stories MUST stay leaves in the dep graph. **No production code imports `*.stories.tsx`.**

If you find yourself wanting to import a story (e.g., to reuse fixture data), extract the data to a `*.fixtures.ts` file:

```
TransactionCard.tsx
TransactionCard.stories.tsx        ← stays story-only
TransactionCard.fixtures.ts        ← reusable, prod-safe
```

The lint guard `scripts/check-no-story-imports.sh` enforces this — fails CI if any non-story file imports `*.stories.*`.

## Decorators

Global Provider lives at `.storybook/preview.tsx` — it wraps every story in `QueryClientProvider`, `AuthProvider`, and the theme/mode wrapper. Stories that touch repositories (TanStack Query) or auth contexts work out of the box.

For per-story decorators (rare), use:

```tsx
export const Padded: Story = {
  decorators: [
    (Story) => <div className="p-4"><Story /></div>,
  ],
};
```

## Viewports

Three presets in `.storybook/preview.tsx`:

- `mobile` — 390 × 844
- `tablet` — 768 × 1024
- `desktop` — 1440 × 900

Default is `mobile`. Per-story override via `parameters.viewport.defaultViewport`:

```tsx
export const DesktopOnly: Story = {
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
```

## Run

```bash
cd frontend
npm run storybook            # dev server at http://localhost:6007
npm run storybook:build      # static SPA at storybook-static/
```

## Phase status

- Phase 2 — Showcase tool installed (Storybook 10, post-pivot 2A→2B per D25).
- Phase 3 (this doc) — Story conventions; lint guard at `scripts/check-no-story-imports.sh`.
- Phase 4 — first batch of atoms (Colors / Typography / Icons under `src/_design/`).
- Phase 6 — Dashboard screen story (the handoff brief deliverable).
- Phase 7 — Playwright snapshot suite over all stories.
