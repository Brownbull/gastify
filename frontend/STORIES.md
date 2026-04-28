# Story authoring conventions (Ladle)

> Phase 3 of the Ladle pivot. Plan: `~/.claude/plans/okay-here-s-something-that-ancient-graham.md`.

## File placement

Stories live next to their component:

```
src/components/transactions/TransactionCard.tsx
src/components/transactions/TransactionCard.stories.tsx   ← here
```

Glob: `src/**/*.stories.{ts,tsx}` (configured in `.ladle/config.mjs`).

## File format (CSF3)

```tsx
import type { Story, StoryDefault } from '@ladle/react';
import { TransactionCard } from './TransactionCard';

export default {
  title: 'Molecules/Transaction Card',
} satisfies StoryDefault;

export const Default: Story = () => (
  <TransactionCard
    merchant="Jumbo Costanera Center"
    amount={24890}
    currency="CLP"
    date={new Date('2026-04-28')}
    itemCount={3}
  />
);

export const Foreign: Story = () => (
  <TransactionCard
    merchant="Whole Foods Market"
    amount={48.50}
    currency="USD"
    date={new Date('2026-04-21')}
    itemCount={5}
  />
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
- Variant names: `Default`, `WithIcon`, `Loading`, `Empty`, `Error`, `LowConfidence`, etc. — describe the *state*, not the prop.
- The default export is metadata only; do not export a story from `default`.

## Args (controls panel)

For data-driven variants, expose `args`:

```tsx
import type { Story } from '@ladle/react';
import { Button } from './Button';

interface ButtonStoryProps {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled: boolean;
}

export const Playground: Story<ButtonStoryProps> = ({ label, variant, disabled }) => (
  <Button variant={variant} disabled={disabled}>{label}</Button>
);

Playground.args = {
  label: 'Save changes',
  variant: 'primary',
  disabled: false,
};

Playground.argTypes = {
  variant: {
    options: ['primary', 'secondary', 'ghost'],
    control: { type: 'select' },
  },
};
```

The Ladle controls panel auto-renders these — that is the "swap props at runtime" interaction.

## Tags (forward-looking)

Phase 6.8 introduces `STORIES-INDEX.md` with REQ + CRUD coverage. Use `parameters.tags`:

```tsx
export default {
  title: 'Screens/Dashboard',
  parameters: {
    tags: ['REQ-1', 'REQ-7', 'crud:Transaction.Read', 'flow:Scan'],
  },
} satisfies StoryDefault;
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

The lint guard `scripts/check-no-story-imports.sh` enforces this. It greps non-story files for imports of `*.stories.*` and exits non-zero on hit. Wire into CI (Phase 8 production-safety check) and into `/gabe-commit` as a project-specific CHECK.

## Decorators

Global Provider lives at `.ladle/components.tsx` — it wraps every story in `QueryClientProvider`, `AuthProvider`, and the theme/mode wrapper. Stories that touch repositories (TanStack Query) or auth contexts work out of the box.

For per-story decorators (rare), use:

```tsx
const Default: Story = () => <Component />;
Default.decorators = [
  (Component) => <div className="p-4"><Component /></div>,
];
```

## Light / dark / theme

Light/dark cycles via Ladle's mode addon → bridged to the `.dark` class in `.ladle/components.tsx`.

Theme switcher (Normal / Professional / Mono) is fixed at `normal` until Phase 3.5 (deferred — will add a custom global). For now: stories render in Normal theme only. If a story needs a specific theme, set it via inline `data-theme` on the story root:

```tsx
export const ProMonoCheck: Story = () => (
  <div data-theme="professional">
    <Button>Pro theme</Button>
  </div>
);
```

## Naming + viewport defaults

For mobile-first stories (PWA target):

```tsx
Default.parameters = {
  width: 'mobile',  // 390px — default per .ladle/config.mjs
};
```

For desktop-only stories (sidebar nav, ⌘K scan):

```tsx
Desktop.parameters = {
  width: 'desktop',  // 1440px
};
```

## Run

```bash
cd frontend
npm run ladle              # dev server at http://localhost:5175
npm run ladle:build        # static SPA at build-ladle/
npm run ladle:preview      # serve build-ladle/ at http://localhost:4176
```

## Phase status

- Phase 2 (this phase) — Ladle installed + config + Provider + sentinel `Welcome` story.
- Phase 3 (this phase) — STORIES.md authored; lint guard at `scripts/check-no-story-imports.sh`.
- Phase 4 — first batch of atoms.
- Phase 6 — Dashboard screen story (the handoff brief deliverable).
- Phase 7 — Playwright snapshot suite over all stories.
