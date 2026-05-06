# STORYBOOK-STRUCTURE.md — local taxonomy contract

This file is the **local taxonomy contract** consumed by the `gabe-mockup` skill (per `~/.claude/skills/gabe-mockup/SKILL.md` line 56) and by RALPH iterations during the rebuild. It overrides the skill's default `apps/web/` assumption and pins Gastify-specific story-title and file-path conventions.

## Path overrides (the apps/web → frontend rebinding)

The `gabe-mockup` skill and its `check-storybook-correspondence.mjs` script default to `apps/web/` when present. **Gastify uses `frontend/` as the React app root.** All path references in skill instructions, RALPH prompts, and verification commands MUST be rewritten as follows:

| Skill default | Gastify reality |
|---|---|
| `apps/web/package.json` | `frontend/package.json` |
| `apps/web/.storybook/` | `frontend/.storybook/` |
| `apps/web/src/design-system/{atoms,molecules,organisms}/**` | `frontend/src/design-system/{atoms,molecules,organisms}/**` *(to be created in rebuild)* |
| `apps/web/src/features/<area>/{components,screens,model,spikes}/**` | `frontend/src/features/<area>/{components,screens,model,spikes}/**` |
| `apps/web/src/**/*.stories.*` | `frontend/src/**/*.stories.*` |
| `apps/web/storybook-static/index.json` | `frontend/storybook-static/index.json` |
| `apps/web/tailwind.config.ts` | n/a — Gastify uses Tailwind 4 with `@theme` in `frontend/src/styles/global.css` (no separate config file) |
| `shared/design-tokens.ts` | n/a — tokens live in `frontend/src/styles/global.css` as CSS custom properties |
| `from apps/web, run npm run typecheck` | `cd frontend && npm run typecheck` |
| `from apps/web, run npm run build-storybook` | `cd frontend && npm run build-storybook` |

When invoking the correspondence script, always pass `--web-dir frontend`:

```bash
node ~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir frontend
```

## Story-title taxonomy

Story `title` strings (CSF3 `meta.title`) MUST follow this physical-taxonomy mapping. The correspondence script enforces these prefixes:

| Story file location | Required title prefix |
|---|---|
| `frontend/src/_design/*.stories.tsx` | `Design System/<Topic>` (e.g., `Design System/Colors`, `Design System/Typography`, `Design System/Icons`) |
| `frontend/src/design-system/atoms/<Atom>/*.stories.tsx` | `Design System/Atoms/<Atom>` |
| `frontend/src/design-system/molecules/<Molecule>/*.stories.tsx` | `Design System/Molecules/<Molecule>` |
| `frontend/src/design-system/organisms/<Organism>/*.stories.tsx` | `Design System/Organisms/<Organism>` |
| `frontend/src/features/<area>/components/<Component>/*.stories.tsx` | `Features/<Area>/Components/<Component>` |
| `frontend/src/features/<area>/views/<View>/*.stories.tsx` *(legacy path — still valid)* | `Features/<Area>/Screens/<View>` |
| `frontend/src/features/<area>/screens/<Screen>/*.stories.tsx` *(rebuild path)* | `Features/<Area>/Screens/<Screen>` |
| `frontend/src/features/<area>/spikes/<Spike>/*.stories.tsx` | `Features/<Area>/Spikes/<Spike>` |
| `frontend/src/Welcome.stories.tsx` | `Welcome` (root-level only — keep this exception) |
| Cross-screen flow stories | `Flows/<FlowName>` *(only when story walks across multiple screens — do not create empty groups)* |

### Title-area mapping (kebab-case folders → Title Case story prefix)

| Folder | Story title `Area` |
|---|---|
| `analytics` | `Analytics` |
| `batch-review` | `Batch Review` |
| `categories` | `Categories` |
| `credit` | `Credit` |
| `dashboard` | `Dashboard` |
| `history` | `History` |
| `insights` | `Insights` |
| `items` | `Items` |
| `reports` | `Reports` |
| `scan` | `Scan` |
| `settings` | `Settings` |
| `transaction-editor` | `Transaction Editor` |

## File path conventions for new code

The rebuild introduces a `design-system/` tree alongside the existing `features/`. New files MUST land here:

```
frontend/src/
├── design-system/          # NEW — shared, feature-agnostic UI
│   ├── atoms/
│   │   └── <Atom>/
│   │       ├── <Atom>.tsx
│   │       ├── <Atom>.stories.tsx
│   │       └── index.ts
│   ├── molecules/
│   └── organisms/
├── features/               # EXISTING — feature-scoped
│   └── <area>/
│       ├── components/     # feature-scoped UI (NOT shared)
│       ├── screens/        # rebuild path; new screens land here
│       ├── views/          # legacy path; existing screens stay until migrated
│       ├── model/          # types, mocks, fixtures
│       └── spikes/         # exploratory, time-boxed work
├── hooks/
│   ├── ui/                 # NEW — adapter boundary (Phase A.1); RALPH imports from here
│   └── data/               # NEW — Firestore-aware; UNTOUCHABLE by RALPH
├── locales/
│   └── es-CL.json          # NEW (Phase A.4) — frozen translation source
├── services/               # UNTOUCHABLE by RALPH
├── repositories/           # UNTOUCHABLE by RALPH
└── styles/
    └── global.css          # design tokens; single source of truth
```

## Story-shape rules (canonical exemplars)

The 5 frozen exemplars at `docs/rebuild/ux/reference-stories/` are the canonical shape. New stories MUST match their pattern:

1. **Mountable with no required props.** The default export's `args` provide every value the screen needs.
2. **Platform × state cartesian.** Use `args.platform: "mobile" | "tablet" | "desktop"` and a state arg (`args.state` or domain-specific equivalent) to drive variants. Export named stories per cell of the cartesian product you want covered (e.g., `MobileDefault`, `MobileEmpty`, `DesktopDefault`).
3. **Stub-`t` strategy** for components that call `useTranslation()`. Pattern: see `ReportsView.stories.tsx`.
4. **Provider stack** comes from `frontend/.storybook/preview.tsx` — do not re-bootstrap providers in individual stories.
5. **Mock at `hooks/ui/` only.** Never mock `services/`, `repositories/`, or Firestore directly. If a screen still pulls from these, it is not yet rebuild-ready and belongs in Phase A.1 work, not Phase D RALPH iteration.

## Verification gate (per-tier — embedded in `prd.json` schema)

The PRD format defined in `RALPH-PRD-FORMAT.md` (forthcoming, Phase B.4) embeds a `gate` field per entry. Tiered cost:

| Tier | Gate steps | Approx cost |
|---|---|---|
| `atom` | typecheck + render test + axe + i18n leak regex | ~5s |
| `molecule` | atom gate + interaction test | ~15s |
| `screen` | molecule gate + Playwright iframe screenshot + visual diff vs `docs/rebuild/ux/baseline-snapshots/` | ~60s |

The i18n leak regex (`\b[a-z]+[A-Z][a-zA-Z]+\b`) is the canonical check inherited from `frontend/STORIES.md`.

## Forbidden patterns

The skill's hardcoded `apps/web/` is one of several skill defaults that **do not apply** here. Also do NOT:

- Create new `docs/mockups/**/*.html` files. The mockup baselines at `docs/mockups/` and `docs/mockups-legacy/` are frozen per DECISIONS.md D27. New UI work lands as React + Storybook, never new HTML mockups.
- Edit files under `docs/rebuild/ux/reference-stories/` — they are read-only exemplars (see that folder's `README.md`).
- Re-bootstrap providers per-story; use `preview.tsx`.
- Hardcode hex colors in React; use `var(--*)` tokens from `frontend/src/styles/global.css`.
- Stack multiple platform frames vertically in one story; use Storybook's viewport addon and per-story `args.platform`.

## Pointers

- gabe-mockup skill — `~/.claude/skills/gabe-mockup/SKILL.md`
- Correspondence script — `~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs`
- Story conventions — `frontend/STORIES.md`
- Design tokens — `frontend/src/styles/global.css`
- Storybook config — `frontend/.storybook/main.ts`, `frontend/.storybook/preview.tsx`
- React + Storybook workflow marker — `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md`
- Frozen exemplars — `docs/rebuild/ux/reference-stories/`
- Rebuild feasibility plan — `~/.claude/plans/i-would-like-to-elegant-tarjan.md`
