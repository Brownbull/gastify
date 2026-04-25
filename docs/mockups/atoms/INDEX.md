# Atoms — gastify

<!-- Seeded during /gabe-mockup M2 (atomic components). Living catalog. -->
<!-- Consumed by atoms/ wireframe dropdowns in M4+ and by molecule composition in M3. -->

**Phase:** 2 — Atomic components
**Tier:** MVP (variants complete · states = default + disabled · focus/hover transitions ready)
**Last updated:** 2026-04-24
**Plan:** `../../.kdbp/PLAN.md`
**Canonical tokens:** `../assets/css/desktop-shell.css` (P1-locked)
**Canonical atom styles:** `../assets/css/atoms.css`
**Runtime:** `../assets/js/tweaks.js` (panel + state-tabs driver)
**Live gallery:** [`index.html`](index.html) — browseable hub with previews of all 10 atoms

> **Always serve via http**, not `file://`. Run `npm run serve:mockups` from repo root → open `http://localhost:4173/atoms/index.html`. Under `file://` Chrome blocks `cssRules` introspection on @import-loaded sheets and partially blocks @font-face URL resolution → the Tweaks panel font select degrades to one option and body text falls back to system-ui (different metrics → different layout). A yellow banner appears on the page when running under file:// to flag this.

## Runtime knobs (Tweaks panel surface)

The right-side Tweaks panel (`tweaks.js`) exposes only controls this project's CSS actually consumes:

| Control | Source of truth | Effect |
|---------|-----------------|--------|
| **Theme** | `desktop-shell.css` `[data-theme="X"][data-mode="Y"]` rules | switches between `normal` / `professional` / `mono` (paired with mode) |
| **Mode** | same | switches between `light` / `dark` (paired with theme) |
| **Font family** | `desktop-shell.css` `body[data-font="space-grotesk"]` rule | toggles between `default` (Outfit) and `space-grotesk` (self-hosted woff2 in `assets/fonts/`) |
| **Viewport** | `desktop-shell.css` `body[data-viewport="X"] .demo-row, .demo-grid, .legacy-section` | clamps demo containers to `mobile` (360px) / `tablet` (768px) / `desktop` (1440px) / `full` (no clamp). The Tweaks panel keeps its 320px gutter regardless |

Primary override / density / corner-radius / text-scale are **deliberately not exposed** at MVP atoms tier — primary override was tried and rejected as user-unnecessary noise; the rest land at P3 molecules where the state matrix justifies them. See DECISIONS.md D8 for rationale.

## Mobile or desktop?

**Both, by design.** The atoms themselves (CSS in `atoms.css`) use no fixed widths — they're inherently responsive when consumed inside any container. The viewport toggle in the Tweaks panel lets you preview each atom inside a 360 / 768 / 1440 frame from the same demo page, so the cross-platform claim in PLAN.md Phase 2 ("Web + mobile") is honored without duplicating per-platform demo files. Legacy BoletApp ships mobile-primary; gastify rebuild adds desktop. Atoms serve both.

## Legacy reference

Each atom HTML embeds a `.legacy-section` showing the BoletApp 2024 visual reference side-by-side with the modern variants. Two sources:

- **Layer A — offline dump.** Pre-extracted HTML at `docs/mockups/legacy-reference/claude-design/preview/` covers Buttons + Chips with `normal` / `professional` / `mono` theme variants. Re-extract via `npm run extract:dump` (parses dump → writes `docs/mockups/atoms/legacy-snapshots/<atom>-<theme>.html`).
- **Layer B — live extraction.** For atoms not in the dump (Input, Select, Avatar, Skeleton, Progress, Spinner) — the `tests/legacy-extract/` Playwright harness logs into the running BoletApp (local dev or Firebase staging) via the TestUserMenu pattern and extracts each element with computed inline styles. Run via:
  ```
  export LEGACY_TEST_USER_EMAIL='...'
  export LEGACY_TEST_USER_PASSWORD='...'
  export LEGACY_BASE_URL='https://boletapp-staging.web.app'   # or http://localhost:5174 if legacy dev server is running
  npm run extract:legacy
  ```
  Atoms without a snapshot show a "BoletApp 2024 reference — not available" placeholder until extraction succeeds.

---

## Inclusion pattern

Every atom HTML file loads the same triad — any screen composing atoms mirrors it:

```html
<link rel="stylesheet" href="../assets/css/desktop-shell.css">
<link rel="stylesheet" href="../assets/css/atoms.css">
<script src="../assets/js/tweaks.js" defer></script>
```

Hex/RGB literals are forbidden in screen HTML — always `var(--token)`.

---

## Catalog

| Atom | File | Variants | Sizes | Primary use |
|------|------|----------|-------|-------------|
| **Button** | [button.html](button.html) | primary · secondary · ghost · destructive · icon | sm · md · lg | Forms, CTAs, toolbars |
| **Input** | [input.html](input.html) | text · password · email · number · search · with affix | md | Forms, search bars, amount entry |
| **Select** | [select.html](select.html) | default · with-value · disabled | md | Currency, jurisdiction, category pickers |
| **Pill** | [pill.html](pill.html) | default · active · with-count | md | Timeframe selector, segmented controls |
| **Badge** | [badge.html](badge.html) | info · success · warning · error · neutral · dot | — | Confidence %, status tags, unread indicators |
| **Avatar** | [avatar.html](avatar.html) | image · initials · icon · muted · accent · stacked | sm · md · lg | Topbar, group rosters, member lists |
| **Chip** | [chip.html](chip.html) | default · selected · removable · with-icon | md | Filter bars, applied-filter clearing |
| **Skeleton** | [skeleton.html](skeleton.html) | line (sm/default/lg) · avatar · chip · card | — | Loading placeholders (prevents CLS) |
| **Progress** | [progress.html](progress.html) | linear (thin/default/thick) · circular · semantic (primary/success/warning/error) | lg=72 circle | Upload %, credit depletion, budget |
| **Spinner** | [spinner.html](spinner.html) | default · ink · on-primary | sm · md · lg | Indeterminate loading (unknown duration) |

---

## Selector map (for CSS review / audit)

```
.btn                    → .btn-primary · .btn-secondary · .btn-ghost · .btn-destructive · .btn-icon
                        → .btn-sm · .btn-lg · [disabled]
.field-group            → .field-label · .field-input (.filled / .field-error / [disabled])
                        → .field-affix (.field-affix__icon) · .field-hint · .field-error-msg
.select                 → [disabled] · :focus
.pill                   → .is-active · .pill__count
.badge                  → .badge-info · .badge-success · .badge-warning · .badge-error · .badge-neutral
                        → .badge-dot
.avatar                 → .avatar-sm · .avatar-lg · .avatar-muted · .avatar-accent
                        → .avatar-stack (container)
.chip                   → .is-selected · .chip__remove
.skeleton               → .skeleton-line (.skeleton-line-sm / .skeleton-line-lg)
                        → .skeleton-avatar · .skeleton-chip · .skeleton-card
.progress               → .progress-thin · .progress-thick
                        → .progress-success · .progress-warning · .progress-error
                        → .progress__bar (child)
.progress-circle        → .progress-circle-lg · [--value: 0-100]
                        → .progress-circle__label (child)
.spinner                → .spinner-sm · .spinner-lg · .spinner-ink · .spinner-on-primary
```

---

## State convention (MVP tier)

| State | Mechanism | Tier coverage |
|-------|-----------|---------------|
| default | class alone | ✅ MVP |
| disabled | `[disabled]` attribute OR `.is-disabled` class | ✅ MVP |
| :hover | CSS transition (background/transform) | ✅ transition lives in CSS, visual demo in hover |
| :focus-visible | 2px outline `var(--primary)` with 2px offset | ✅ accessible by default |
| error (inputs) | `.field-error` class + `.field-error-msg` sibling | ✅ MVP |
| loading (buttons) | `<span class="spinner spinner-sm spinner-on-primary">` inside + `[disabled]` | ✅ MVP |

Enterprise-tier expansion (P3 molecules and later) adds explicit pressed/selected/indeterminate state classes.

---

## Downstream

- **P3 molecules** — compose atoms into cards, modals, toasts, nav, filters, sheets, forms. See phase details in `../../.kdbp/PLAN.md` § Phase 3.
- **P4 wireframes (M4)** — `wf-slot` dropdowns pick which atom fills each slot. Atom `data-slot` value = file name without extension (e.g., `<option value="button">button.html</option>`).
- **P5–P12 screens** — import `desktop-shell.css + atoms.css + tweaks.js` triad. Never inline atom styles in screen HTML.

---

## Audit triggers

- `/gabe-review` CHECK 7 → flags any hex/RGB literal under `docs/mockups/` outside `assets/css/` (tokens stay there; atoms + screens use vars only).
- `/gabe-commit` CHECK 9 doc drift → warns when a new atom file lands without a row in this INDEX.
- M3 molecules phase → back-ports any missing atom surfaced during composition (recipe gate).

---

## Changelog

- **2026-04-24** — Initial M2 authoring. 10 atoms live. atoms.css canonical. MVP tier: variants complete, default + disabled states explicit, focus/hover transitions in CSS.

## Known gaps (for M13 audit)

**Resolved 2026-04-24** (via /gabe-review Phase 2 triage — see LEDGER):

- ~~Mono Dark `--primary-ink` contrast~~ → fixed: `--primary-ink: #09090b` override in `[data-theme="mono"][data-mode="dark"]` block (~9:1 contrast, passes WCAG AA). **Note:** Normal Dark (`--primary: #6b9e7a` × `#fff` ≈ 2.92:1) and Professional Dark (`--primary: #3b82f6` × `#fff` ≈ 4.0:1) remain on `#fff` and need M13 WCAG re-audit on borderline cases.
- ~~`rgba(0,0,0,0.08)` literals on `.pill__count` + `.chip__remove:hover`~~ → tokenized: `--overlay-soft` lives in `desktop-shell.css` with light/dark theme overrides.

**Open** (deferred to M13 audit):

- **GAP-1 — `progress-circle` mask color in cards.** Atoms ship `--progress-mask: var(--bg)` default. Molecule consumers (cards, modals, sheets) MUST override: `style="--progress-mask: var(--surface);"` on the circle when composed inside a non-bg surface, or the inner mask color-bleeds. Document in P3 component-library.
- **GAP-2 — Functional alpha literals retained.** `.skeleton::after` shimmer (`rgba(255,255,255,0.35)` light + `rgba(255,255,255,0.08)` dark, line 351/361) and `.spinner-ink`/`.spinner-on-primary` border colors (`rgba(0,0,0,0.12)` + `rgba(255,255,255,0.3)`, line 450/451) intentionally use white-tint alpha for shimmer/spinner ring functional effect — both have explicit dark-mode handling already. Tokenizing here would not improve theme-stability.
- **GAP-3 — `.pill.is-active .pill__count` uses `rgba(255, 255, 255, 0.25)`.** Intentional — the active pill has a solid `--primary` background, and the count-bubble needs a light tint regardless of theme so `--primary-ink` text reads on top. Functional alpha; documented exception.
- **GAP-4 — `.btn-destructive` text uses `var(--ink-on-error, #ffffff)`.** White text on saturated `--error` backgrounds reads safely across all 6 themes; the `--ink-on-error` token slot is exposed if a future theme needs to override it. M13 should verify contrast on Mono Dark `--error: #fafafa` (white-on-near-white would fail — but Mono Dark uses `#fafafa` for error which inverts the surface assumption; needs visual check).
