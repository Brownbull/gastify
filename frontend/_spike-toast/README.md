# gastify — React frontend

Emitted by `/gabe-mockup spike` (Spike P14.0).

## Run

```bash
npm install
npm run dev   # http://localhost:5173
```

## Add a component

```bash
# Pre-condition: docs/mockups/<section>/<name>.html exists and is live.
/gabe-mockup spike <name>            # leaf only
/gabe-mockup spike <name> --system   # leaf + Provider + Container + hook
```

See `docs/mockups/REACT-PORT-RECIPE.md` for conventions and the next-component checklist.

## What's NOT here (intentionally, per Pareto)

- No Tailwind — tokens come from `docs/mockups/assets/css/desktop-shell.css` + `atoms.css` + `molecules.css` via `@import`
- No router — demo pages live under `src/demo/`; routing is the consuming app's job
- No Storybook — `<Component>Demo.tsx` covers the same need at a fraction of the surface area
- No Vitest/RTL — manual + visual verify is enough for spike-level validation; add when first behavior bug shows up
