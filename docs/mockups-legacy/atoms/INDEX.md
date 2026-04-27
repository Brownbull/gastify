# Atoms — mockups-legacy catalog

Living catalog for Phase L1. Each row links the **mockup HTML**, the **React source** that informed the extraction, and the eventual **molecule consumers** (populated during L2).

**Source of truth:** [`frontend/src/`](../../../frontend/src/).
**Token vocabulary:** [`assets/css/desktop-shell.css`](../assets/css/desktop-shell.css) (extracted from `frontend/index.html` `:root` blocks).
**Atom rules:** [`assets/css/atoms.css`](../assets/css/atoms.css) (this folder, 13 sections).
**Last updated:** 2026-04-27 (Phase L1; categories + icon atoms added during /gabe-review fix sweep).

---

## Why these 13 atoms

Phase plan said "extract ~13 atoms from `frontend/src/components/` + `frontend/src/shared/ui/`". Initial extraction landed 11 visual primitives. The /gabe-review sweep on 2026-04-27 added the missing 12th + 13th:

**Atoms that exist as React files in the frontend:**
- `frontend/src/shared/ui/Toast.tsx` → [toast.html](toast.html)
- `frontend/src/components/Toast.tsx` (legacy variant; same shape) → covered by [toast.html](toast.html)

**Atoms that exist as visual patterns inlined in JSX** (frontend uses Tailwind utility composition rather than dedicated atom React components):
- button, input, select, pill, badge, avatar, chip, skeleton, progress, spinner

**Atoms representing data-driven design vocabulary** (added 2026-04-27):
- **categories** — 12 L1 Rubros catalog driven by `frontend/src/config/categoryColors/groupColors.ts` STORE_GROUP_COLORS + STORE_GROUP_INFO. No React file; the visual vocabulary lives in tokens (`--cat-<key>-{fg,bg,border}` per theme/mode).
- **icon** — lucide-react icon registry (158 imports across `frontend/src/**/*.tsx`). Top 30 most-used icons inlined as SVG; emoji icons for L1 Rubros also catalogued.

---

## 1. Catalog

| Atom | Mockup | React source | States covered | Used by molecules | Status |
|---|---|---|---|---|---|
| **button** | [button.html](button.html) | inlined JSX (no `Button.tsx`); representative: [`features/transaction-editor/*`](../../../frontend/src/features) save/cancel patterns + `style={{ backgroundColor: 'var(--primary)' }}` | 5 variants × 3 sizes × default/hover/disabled/loading | _populated L2_ | ✅ authored |
| **input** | [input.html](input.html) | [`CategoryLearningPrompt.tsx`](../../../frontend/src/components/CategoryLearningPrompt.tsx), `features/items/*` (recurring `border rounded-lg text-sm` shape) | 5 types × 3 sizes × default/filled/focus/error/disabled | _populated L2_ | ✅ authored |
| **select** | [select.html](select.html) | [`LocationSelect.tsx`](../../../frontend/src/components/LocationSelect.tsx) (button-trigger variant — molecule); native `<select>` in settings | 3 fillings × default/selected/disabled | _populated L2_ | ✅ authored |
| **pill** | [pill.html](pill.html) | filter rows + transaction-card category labels in `features/history/*` and `features/insights/*` | 6 variants + with-icon | _populated L2_ | ✅ authored |
| **badge** | [badge.html](badge.html) | [`Nav.tsx`](../../../frontend/src/components/Nav.tsx) (alert count), [`TopHeader.tsx`](../../../frontend/src/components/TopHeader.tsx) (notification dot) | counts (1/12/99+/dot) × 4 variants × on-host stack | _populated L2_ | ✅ authored |
| **avatar** | [avatar.html](avatar.html) | [`ProfileDropdown.tsx`](../../../frontend/src/components/ProfileDropdown.tsx), [`Nav.tsx`](../../../frontend/src/components/Nav.tsx) | 5 sizes × 4 color variants × initials + img | _populated L2_ | ✅ authored |
| **chip** | [chip.html](chip.html) | [`features/history`](../../../frontend/src/features) `FilterStrip.tsx`; `features/insights` `InsightTabs.tsx` (3-tab Lista/Airlock/Logro) | states + with-count + filter-strip + 3-tab + removable | _populated L2_ | ✅ authored |
| **skeleton** | [skeleton.html](skeleton.html) | [`features/scan/components/ScanSkeleton.tsx`](../../../frontend/src/features/scan/components/ScanSkeleton.tsx) (canonical), `BatchProcessingOverlay.tsx` | 5 shapes × scan-card composition × list-item composition | _populated L2_ | ✅ authored |
| **progress** | [progress.html](progress.html) | [`BatchProcessingOverlay.tsx`](../../../frontend/src/features/scan/components/BatchProcessingOverlay.tsx) (batch 12/50), [`Nav.tsx`](../../../frontend/src/components/Nav.tsx) (credit usage) | 3 sizes × 5 variants × 4 fill states × indeterminate | _populated L2_ | ✅ authored |
| **spinner** | [spinner.html](spinner.html) | [`ScanSkeleton.tsx`](../../../frontend/src/features/scan/components/ScanSkeleton.tsx) `<Loader2>` from `lucide-react`; many `*Overlay.tsx` files | 3 sizes × 6 variants × inline-with-label compositions | _populated L2_ | ✅ authored |
| **toast** | [toast.html](toast.html) | [`shared/ui/Toast.tsx`](../../../frontend/src/shared/ui/Toast.tsx) (canonical, `TOAST_COLORS` map → primary/accent/error/warning) | 4 variants × ARIA + animation anatomy | _populated L2 (queue + provider)_ | ✅ authored |
| **categories** | [categories.html](categories.html) | [`config/categoryColors/groupColors.ts`](../../../frontend/src/config/categoryColors/groupColors.ts) (STORE_GROUP_COLORS) + [`groups.ts`](../../../frontend/src/config/categoryColors/groups.ts) (STORE_GROUP_INFO emoji + name map) | 12 L1 Rubros × {fg, bg, border} per theme/mode = 72 tokens; pill/chip/badge variants | filter-strip, card-transaction, insight-card, report-row | ✅ authored |
| **icon** | [icon.html](icon.html) | [lucide-react](https://lucide.dev) (158 imports across `frontend/src/**/*.tsx`); emoji icons from STORE_GROUP_INFO | 5 sizes (sm/md/lg/xl/2xl) × stroke icons (top 30) + emoji variant; `currentColor` flow | nav-bottom, nav-top, modal/sheet/drawer (close X), filter-strip, toast | ✅ authored |

---

## 2. Selector convention

Class names use **double-dash variant suffix** (BEM-lite):

- `.btn` — base
- `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--destructive`, `.btn--icon` — variants
- `.btn--sm`, `.btn--lg`, `.btn--block` — modifiers (composable)
- `.btn[disabled]`, `.btn:focus-visible` — pseudo-states (no class needed)

Variants encode **what** (color / shape / role); modifiers encode **how** (size / width / spacing). State is pseudo-class or `aria-*` driven, not class-driven, except where ARIA isn't expressive enough (`.is-active`, `.is-error`, `.is-indeterminate`, `.is-leaving`).

The frontend's Tailwind utility composition produces the same visual outcome via `bg-... rounded-... px-... py-...` chains. The catalog rule is "if a refactor of the JSX into named atom selectors would land on this name, this is the right name."

---

## 3. State coverage convention

Each atom HTML includes a **States** section (or equivalent) demonstrating:

- **default** — resting state
- **interactive** — hover (where applicable; documented inline since CSS-only mockups can't trigger dynamic hover in screenshots) + focus
- **disabled** — `[disabled]` or `[aria-disabled="true"]`
- **error / loading / busy** — where the atom supports it (input + button + progress + skeleton)

For atoms whose interactive states require live JS (e.g., chip toggling), the demo shows multiple chips with different `aria-pressed` values rather than a single chip cycling state. Real interaction lives in the molecule that wraps it.

---

## 4. Verification status

L1 verification per [`VERIFICATION.md`](../VERIFICATION.md) is **manual / visual** for the first pass. Per-atom screenshots into `extraction-snapshots/<name>/<name>-mockup-{light,dark}.png` + `<name>-live-{light,dark}.png` are pending and will be captured opportunistically as L2/L4 screens reuse atoms (the screen-level verifications surface drift faster than per-atom captures).

If systematic drift surfaces during L2 (e.g., 3+ molecules show the same kind of difference vs. live), we'll add a Playwright test covering all atoms × themes × modes per the VERIFICATION recipe section "When automation might help".

---

## 5. Dependencies down (one level)

Atoms depend on **tokens only** — no atom imports another atom. Token chain:

```
desktop-shell.css   (verbatim from frontend/index.html :root blocks)
        ↓
atoms.css           (this folder; 11 atom rule sections)
        ↓
atoms/<name>.html   (each atom's demo page)
```

Compositions inside atom HTMLs (e.g., spinner inside button-loading swatch, skeleton-circle + skeleton-text in list-item composition) are **demonstrative** — the actual atom rule for `.btn` does not depend on `.spinner`. Consumers (molecules) that compose two atoms together do so by class concatenation in markup, not by CSS extension.

---

## 6. Cross-references

- Principal hub: [`../index.html`](../index.html)
- Methodology: [`../README.md`](../README.md)
- Verification recipe: [`../VERIFICATION.md`](../VERIFICATION.md)
- Root catalog: [`../INDEX.md`](../INDEX.md) (this index feeds §2 there)
- Clean-slate counterpart: [`../../mockups/atoms/INDEX.md`](../../mockups/atoms/INDEX.md) — same atom set, different token vocabulary, different source (clean-slate design vs. operational extraction)
