# Verification recipe

Per-component side-by-side comparison procedure. Used after authoring each atom, molecule, or screen during phases L1–L4.

## Prerequisites

```bash
# Terminal 1 — live React app
cd frontend && npm run dev      # → http://localhost:5174

# Terminal 2 — mockup preview
cd docs/mockups-legacy && npx http-server . -p 4173 -c-1
                                # → http://localhost:4173
```

## The procedure (per component)

For each component you've just authored, run these steps via Playwright MCP or browser DevTools:

### 1. Open both surfaces

- **Mockup:** `http://localhost:4173/<tier>/<name>.html` (e.g., `/atoms/button.html`)
- **Live:** `http://localhost:5174/` then navigate to the screen that contains the component

### 2. Set matching theme/mode

Mockup: open the Tweaks panel (right edge), pick `theme=normal`, `mode=light`.
Live: matching themes via the user-menu → Preferencias.

Repeat the comparison for each (theme × mode) combination relevant to the component. Default coverage: `normal/light` + `normal/dark`. Extended: all 6 combos for foundation atoms.

### 3. Compare four dimensions

| Dimension | Check | Acceptable drift | Unacceptable drift |
|---|---|---|---|
| **Layout** | spacing, alignment, hierarchy, container widths | subpixel rounding | any token-derived gap or padding diff |
| **Tokens** | `getComputedStyle()` on key elements: background, color, border, shadow | identical hex values | any color or shadow that doesn't match a token |
| **Typography** | font-family, font-weight, font-size, line-height | none | any divergence |
| **States** | hover, focus, active, disabled, loading, error (where applicable) | timing of transitions | wrong color, missing state, unexpected state |

### 4. Capture before/after

Save a screenshot of both into `extraction-snapshots/<tier>/<name>/`:

- `<name>-mockup-light.png`
- `<name>-mockup-dark.png`
- `<name>-live-light.png`
- `<name>-live-dark.png`

These form the audit trail. They're not gitignored — they're committed alongside the component HTML so future drift can be diff'd.

### 5. Iterate or accept

- If any dimension shows unacceptable drift → fix the mockup HTML/CSS, re-run steps 2–4.
- If all dimensions pass → mark the component verified in its catalog row, link the screenshots, move on.

## Programmatic spot-checks

For tighter verification of token values, run this Playwright snippet after both pages are loaded:

```javascript
// In the mockup page console:
const m = getComputedStyle(document.querySelector('.btn--primary'));
console.log({ bg: m.backgroundColor, color: m.color, border: m.borderColor });

// In the live page console (same selector or its equivalent):
const l = getComputedStyle(document.querySelector('.btn--primary'));
console.log({ bg: l.backgroundColor, color: l.color, border: l.borderColor });
```

Values should be identical (rgb form). Any divergence means the mockup is missing a token mapping.

## When automation might help

Manual verification is fine for the first pass through L0–L2. If drift becomes systematic — e.g., the same kind of difference shows up in 5+ components — write a small Playwright test that:

1. Loads mockup + live versions of every catalogued component
2. For each, captures `getComputedStyle()` snapshots of N key elements
3. Diffs them, reports failures

Don't pre-build this. Add it only if the manual cost crosses a threshold.

## Exceptions

Some components legitimately differ between mockup and live:

- **Animations / interactivity:** mockups are static. Document interaction behavior in the component's HTML (a `<section class="platform-notes">`), don't try to reproduce it.
- **Real data:** mockups use static fixtures. The live frontend may show different data. Compare structure, not content.
- **Optimistic state:** the live app may flicker through transient states the mockup can't show. Compare steady-state.

For each exception, note it in the component's catalog row + a short comment in the HTML (`<!-- Drift: animation timing not reproduced -->`).
