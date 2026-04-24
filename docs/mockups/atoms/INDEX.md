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
| **Badge** | [badge.html](badge.html) | info · success · warning · error · neutral · dot | xs | Confidence %, status tags, unread indicators |
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

- `--primary-ink` is only defined in `:root` default block of `desktop-shell.css`; it cascades to `#ffffff` in every theme. Works for Normal/Professional (saturated primary → white text passes WCAG AA). **Mono Dark** edge case: `--primary: #a1a1aa` (light grey) + white ink = low contrast on `.btn-primary`. Verify in M13 WCAG pass; consider per-theme `--primary-ink` overrides.
- Chip `background: rgba(0,0,0,0.08)` in `.pill__count` and `.chip__remove:hover` uses an RGB literal for a translucent overlay. Token-fied alternative would be a dedicated `--overlay-soft` var — defer to M3 molecules refactor if a second use-site appears.
