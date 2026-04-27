# React port recipe — gastify

> Emitted by `/gabe-mockup spike toast --system` on 2026-04-26 (Spike P14.0). Augmented on every subsequent spike.

This file documents how `gastify` translates static mockups under `docs/mockups/` into shipping React components under `frontend/src/components/`. Read it before adding a new component — the recipe is mechanical once the conventions hold.

## File layout

```
frontend/
├── package.json                        # vite + react + ts (no Tailwind, no router, no Storybook)
├── vite.config.ts                      # alias @mockups → ../docs/mockups
├── tsconfig.json
├── index.html                          # <body data-theme="normal" data-mode="light">
├── README.md                           # one-screen "how to run + how to add a component"
└── src/
    ├── main.tsx                        # mounts <App />
    ├── App.tsx                         # wraps demo in ToastProvider (when --system)
    ├── styles/tokens.css               # @import "@mockups/assets/css/{desktop-shell,atoms,molecules}.css"
    ├── components/
    │   └── Toast/
    │       ├── Toast.tsx
    │       ├── Toast.css               # plain CSS (NOT .module.css — Vite would scope class names)
    │       ├── Toast.types.ts
    │       ├── ToastProvider.tsx       # only with --system
    │       ├── ToastContainer.tsx      # only with --system
    │       └── useToast.ts             # only with --system
    └── demo/
        └── ToastDemo.tsx
```

## Token chain — single source of truth

`src/styles/tokens.css` re-exports the canonical mockup CSS via `@import "@mockups/assets/css/..."` (resolved through a Vite alias to `docs/mockups/`). Switching `[data-theme][data-mode]` on `<body>` cascades through both the static HTML mockup AND every React component.

**gastify is a "legacy port" project**, so the canonical CSS is split across three files (`desktop-shell.css` for tokens, `atoms.css` and `molecules.css` for component rules). All three are `@import`-ed in `src/styles/tokens.css`. Greenfield projects with a single `tokens.css` only need one `@import` line.

**Never redeclare a token value in React-side CSS.** If you reach for a hex literal, you have drift — find the right `var(--*)` token in the canonical CSS instead.

## DOM-mirroring rule

JSX structure mirrors the HTML mockup verbatim: same class names (`.toast`, `.toast-icon`, `.toast-body`, `.toast-title`, `.toast-message`, `.toast-close`), same variant convention (`is-success` className, NOT `data-variant`), same ARIA roles (`role="status"` for success/info/warning, `role="alert"` for error). The molecule's existing CSS rules (in `assets/css/molecules.css`) apply unchanged because selectors are identical.

## JSDoc backref convention

Every React component file begins with:

```ts
/**
 * @see ../../../../docs/mockups/molecules/toast.html (canonical mockup)
 * @see ../../../../docs/mockups/molecules/COMPONENT-LIBRARY.md (state matrix)
 */
```

The mockup HTML is the spec; the React file is the implementation. Backref makes the lineage findable at a glance and survives renames.

## Animation handling

CSS transitions on mount work cleanly — the existing `.toast` rule applies `mol-toast-in` keyframes from `molecules.css`. For unmount, the React component sets an `is-dismissing` className that triggers `mol-toast-out`, then a 200ms `setTimeout` calls `onDismiss(id)`. This is intentionally simple; if a future component needs richer choreography, add `<TransitionGroup>` or Framer Motion at THAT time, not preemptively.

## System layer (when applicable)

A "system layer" molecule (Toast is one) needs:

1. **Provider** that owns the visible queue (max 3, FIFO eviction at overflow)
2. **Container** that renders the queue inside the canonical `.toast-stack` element
3. **Hook** (`useToast`) that dispatches into the queue from anywhere in the subtree

Leaf-only molecules skip these three files entirely. The decision rule: **needs a system layer** ↔ **multiple instances appear concurrently at runtime** (toast, modal-stack, drawer-stack). Singleton-per-screen molecules (cards, banners, forms) are leaf-only.

## Pre-flight checklist for the next component port

1. [ ] Pick the next component from `docs/mockups/<section>/<name>.html` (must be live, not placeholder)
2. [ ] Confirm the canonical CSS has rules for it; if not, port the mockup's inline `<style>` to `assets/css/molecules.css` first
3. [ ] Decide leaf-only vs `--system` (multiple-instance test above)
4. [ ] Run `/gabe-mockup spike <name>` (with `--system` if applicable)
5. [ ] Sanity check: `cd frontend && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build` — both must succeed before visual diff
6. [ ] Visual diff against the static mockup at port 4173 vs React at port 5173 in light + dark
7. [ ] If drift: hex literal in React CSS? token chain broken? class name typo? ARIA role mismatch?
8. [ ] Update this file's "Components ported" table with one row

## Components ported

| Component | Date | --system? | Notes |
|---|---|---|---|
| Toast | 2026-04-26 | yes | Leaf + Provider + Container + useToast hook. 4 variants × auto-dismiss + hover-pause + queue (max 3). Spike P14.0 — first /gabe-mockup spike invocation; recipe calibrated against this run. |

## Should this become `gabe-mockup` M14?

Open question — re-evaluate after 2–3 more components are ported via this recipe. Mechanical parts (scaffold, file layout, token chain, JSDoc backref, demo page) are clearly codify-able. Judgment-based parts (which `--system` shape, animation strategy per component, which mockup CSS files to import) need more lived experience to know what auto-detection rules would look like. Track the answer here.

**Calibration notes from Spike P14.0 (Toast):**

- Vite resolves `@import "@mockups/..."` correctly via the `vite.config.ts` alias + `tsconfig.json` `paths` entry. No fallback required.
- `.css` (not `.module.css`) is non-negotiable for the leaf component file — Vite's automatic CSS-Modules scoping silently breaks the DOM-mirroring rule otherwise.
- Empty `Toast.css` file is the right pattern when the canonical CSS already has all rules — file exists in the import graph as a hook for future React-side rules without forcing them today.
- `npx vite` from this shell environment fails with a misleading "Missing script" error; invoke `./node_modules/.bin/vite` directly. The recipe's verification command should reflect this, not `npm run`.
