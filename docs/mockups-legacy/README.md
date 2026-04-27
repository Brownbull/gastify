# mockups-legacy

Parallel mockup hierarchy **extracted from the operational React port** at [`frontend/`](../../frontend/). Sits alongside the clean-slate [`docs/mockups/`](../mockups/) — together they give the frontend rebuild team two reference perspectives:

- **`docs/mockups/`** — clean-slate redesign (what we ideally want)
- **`docs/mockups-legacy/`** — extracted from the operational legacy port (what already exists and works)

> **Why this exists.** Mid-design, screenshot+devtools-from-staging wasn't producing usable fidelity for the P5–P12 screens (auth, capture, batch, history, trends, reports, groups, settings, edge states). We ported BoletApp's React frontend into `frontend/` with mocked backends — it's now operational. This folder holds the mockup-format extraction of that running app.

## Methodology

**Source-driven create, Playwright verify.** For each component or screen:

1. **Read** the React source under `frontend/src/`. Identify JSX structure, Tailwind classes, CSS-var tokens consumed, atom/molecule dependencies, state shape.
2. **Author** clean idiomatic mockup HTML in this folder using the canonical CSS chain (`assets/css/desktop-shell.css` → `atoms.css` → `molecules.css`). Class names mirror the JSX so a side-by-side compare is selector-identical. No inline hex/rgb. No Tailwind classes — translate utilities into named class rules in the appropriate canonical CSS file.
3. **Verify** via Playwright. Load mockup at `localhost:4173` (this folder) + live frontend at `localhost:5174` side-by-side. Compare layout, tokens, typography, per-state appearance.
4. **Catalog** the artifact in the relevant `INDEX.md` / `COMPONENT-LIBRARY.md` with a back-link to the React source file.

Full recipe in [`VERIFICATION.md`](VERIFICATION.md).

## Folder structure

```
mockups-legacy/
├── README.md                 ← you are here
├── INDEX.md                  ← catalog (workflows, screens, components, gaps)
├── COMPARISON.md             ← (Phase L5) what differs from clean-slate docs/mockups/
├── VERIFICATION.md           ← Playwright verification recipe
├── index.html                ← principal hub
├── assets/
│   ├── css/
│   │   ├── desktop-shell.css ← frontend tokens (extracted verbatim from frontend/index.html)
│   │   ├── atoms.css         ← atom rules (populated Phase L1)
│   │   └── molecules.css     ← molecule rules (populated Phase L2)
│   ├── js/tweaks.js          ← copy of docs/mockups runtime panel (theme/mode/font/density/radius)
│   ├── icons/                ← copy of docs/mockups icon set (gastify shared)
│   └── fonts/                ← (empty; frontend uses Google Fonts via CDN)
├── atoms/                    ← Phase L1
├── molecules/                ← Phase L2
├── flows/                    ← Phase L3
├── screens/                  ← Phase L4
└── extraction-snapshots/     ← Playwright captures used during verification
```

## Token vocabulary

The frontend defines tokens as CSS custom properties inline in `frontend/index.html` lines 17–478. Those are the **source of truth** for this folder — extracted verbatim into `assets/css/desktop-shell.css` with one mechanical translation:

- frontend uses `.dark` class for dark mode
- this file uses `[data-mode="dark"]` so the canonical `tweaks.js` runtime panel works out of the box

Theme combinations supported: 3 themes × 2 modes = 6 variants.

| Theme | Light | Dark |
|---|---|---|
| `normal` (default) | warm cream / forest green | dark forest / muted sage |
| `professional` | slate / blue | slate-900 / blue-500 |
| `mono` | zinc-50 / zinc-900 | zinc-950 / zinc-700 |

Switch at runtime via the Tweaks panel injected by `tweaks.js`. Selectors in HTML follow the convention `body[data-theme="..."][data-mode="..."]`.

## Running locally

```bash
# Terminal 1 — live React app
cd frontend
npm run dev               # → http://localhost:5174

# Terminal 2 — mockup hierarchy preview
npx http-server docs/mockups-legacy -p 4173 -c-1
                          # → http://localhost:4173
```

The `-c-1` flag disables caching so file changes show on refresh. The clean-slate hierarchy at `docs/mockups/` uses port 8080 (default for `http-server`); we use 4173 here so both can be browsed simultaneously.

## Out of scope

This folder documents what the legacy frontend **does**, not what it **should do**. The architectural fragility findings (dual-ledger drift, missing `'spent'` credit status, etc.) and UX gaps (error dialog ignores message, currency-mismatch overwrites without conversion, etc.) live in [`.kdbp/KNOWLEDGE.md`](../../.kdbp/KNOWLEDGE.md) and [`.kdbp/PENDING.md`](../../.kdbp/PENDING.md). They are inputs for the rebuild — not bugs to fix here.

## Status

| Phase | Description | Status | Hours est. |
|---|---|---|---|
| L0 | Foundation | ✅ Exec done (2026-04-27) | 3 |
| L1 | Atoms (11 extracted; 13 originally targeted) | ✅ Exec done (2026-04-27) | 4 |
| L2a | Molecules — direct counterparts (~18) | ⬜ pending | 5 |
| L2b | Molecules — frontend-specific (~40-60) | ⬜ pending | 6 |
| L2c | Molecules — specialized | ⬜ pending | 4 |
| L3 | Flows (~7-10) | ⬜ pending | 4 |
| L4a–L4h | Screens by section (~57 total) | ⬜ pending | ~24 |
| L5 | Catalog + cross-refs + handoff | ⬜ pending | 2 |
| | **Total** | | **~52** |

> **Status legend.** "✅ Exec done" means the phase's implementation work landed but Review/Commit/Push columns may still be tracking via `.kdbp/PLAN.md`. The L1 review pass (2026-04-27) reduced atom count from 13→11 because the live frontend uses inline Tailwind utilities rather than dedicated atom components for `pill`, so what got extracted are the visual primitives a Tailwind→named-class refactor would land on.

Plan reference: [`~/.claude/plans/at-this-stage-maybe-sunny-wall.md`](../../../../.claude/plans/at-this-stage-maybe-sunny-wall.md)
