# Story authoring conventions (Storybook 10)

> Phase 3 of the pivot, rewritten after pivot 2A→2B (DECISIONS.md D25). Plan: `~/.claude/plans/okay-here-s-something-that-ancient-graham.md`.

## Scope boundary — what belongs in Storybook

**Storybook covers:**

- **Atoms** — design-token showcases (Colors, Typography, Icons) + future single-purpose UI primitives.
- **Molecules** — small composites (cards, banners, dialogs, form groups). Must work with stub callbacks; no heavy context dependencies.
- **Self-contained screens** — views that read everything via hooks/contexts already wrapped in `.storybook/preview.tsx` (Firebase mocks + QueryClient + Auth). The view mounts with no required props (or only documented test overrides). Dashboard is the canonical example: `<DashboardView />` with no props renders the full screen because `useDashboardViewData()` reads from globals.

**Storybook explicitly does NOT cover:**

- **Orchestrator-driven flows** — components selected by a state machine (e.g., `ScanFeature.tsx` switching between `IdleState` / `CameraView` / `ProcessingState` / `ReviewingState` / etc. by `phase`). Storying any single state component needs a wrapper to seed the Zustand store, which manufactures bugs (translation key leaks, phase guards firing, etc.) and inverts the cost/benefit of the storybook surface.
- **Device-API-coupled views** — anything depending on `getUserMedia`, geolocation, file APIs that need a real browser permission flow. Camera viewfinders go here.
- **Deep multi-context views** — review/edit screens that need scan results + category picker state + confidence wiring (e.g., `TransactionEditorView`). The mocking surface exceeds the mockup value.

**For the excluded categories:** use the running app (`cd frontend && npm run dev`). Capture screenshots into a per-flow reference doc under `docs/reference/<flow>.md` if a designer needs the "all states at once" overview. See `docs/reference/scan-flow.md` for the canonical example.

**Decision aid — does this view belong in Storybook?**

| Test | If yes |
|------|--------|
| Mounts with `<View />` (no required props) and renders fully? | ✅ story-able |
| Reads from hooks already provided by `preview.tsx` (Firebase mocks + QueryClient + Auth)? | ✅ story-able |
| Needs a wrapper that seeds Zustand state on mount? | ❌ skip; document in reference doc |
| Needs `getUserMedia` / camera / device permission? | ❌ skip; document in reference doc |
| Needs >2 mocked contexts beyond what `preview.tsx` already provides? | ❌ skip; reference doc |

When in doubt, try the 30-line story first (mount + viewport parameter). If it works, ship. If you find yourself building the third wrapper, stop — it doesn't belong in Storybook.

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

## Screens convention — platform × state args

Screen-level stories (anything under `Screens/` or `Flows/`) follow a two-axis pattern that mirrors the sibling Storybook setup:

1. **`platform` arg** — `mobile` | `tablet` | `desktop`. Constrains the story's frame width (mobile 390 / tablet 768 / desktop fluid). Pair with `parameters.viewport.defaultViewport` so the toolbar viewport matches the named story.
2. **`state` arg** — `default` | `empty` | `loading` | `error` | … domain-specific states. Drives `_testOverrides` (or equivalent) into the view to swap data shapes without re-seeding mocked Firestore.

The screen wrapper is a small component that takes `(platform, state)` props, computes the width frame + state overrides, then mounts the real view component. Each named story exports a pre-set `(platform, state)` combination.

Example (see [DashboardView.stories.tsx](src/features/dashboard/views/DashboardView/DashboardView.stories.tsx)):

```tsx
type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState = 'default' | 'empty' | 'loading' | 'error';
interface Args { platform: Platform; state: DataState; }

const PLATFORM_WIDTH = { mobile: 390, tablet: 768, desktop: undefined } as const;

const ScreenWrapper: React.FC<Args> = ({ platform, state }) => {
  const overrides = buildOverrides(state);
  const width = PLATFORM_WIDTH[platform];
  return (
    <div style={{ width: width ? `${width}px` : '100%', maxWidth: '100%', margin: '0 auto' }}>
      <RealView _testOverrides={overrides} />
    </div>
  );
};

const meta: Meta<Args> = {
  title: 'Screens/Dashboard',
  component: ScreenWrapper,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    platform: { options: ['mobile', 'tablet', 'desktop'], control: { type: 'inline-radio' } },
    state: { options: ['default', 'empty', 'loading', 'error'], control: { type: 'select' } },
  },
  args: { platform: 'mobile', state: 'default' },
};

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
// + TabletDefault, DesktopDefault, MobileEmpty, MobileLoading, MobileError, …
```

Naming convention for sidebar entries: `<Platform> · <State>` with a middle-dot separator. Pre-bake the combinations you actually need (don't ship a 24-story matrix when you only review 6 of them).

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
