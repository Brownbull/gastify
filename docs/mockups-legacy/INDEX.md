# mockups-legacy — Catalog

Living index for the operational-frontend extraction. Mirrors the structure of [`docs/mockups/INDEX.md`](../mockups/INDEX.md) but populated from `frontend/src/`.

**Source of truth:** the React port at [`frontend/`](../../frontend/).
**Active plan:** `~/.claude/plans/at-this-stage-maybe-sunny-wall.md`
**Last updated:** 2026-04-27 (Phase L1 — atoms exec ✅, review pending)

---

## 1. Phase status

| Phase | Description | Status |
|---|---|---|
| L0 | Foundation: tokens, hub, tooling | ✅ exec |
| L1 | Atoms (11) | ✅ exec · ⬜ review/commit/push |
| L2a | Molecules — direct counterparts (~18) | ⬜ |
| L2b | Molecules — frontend-specific (~40-60) | ⬜ |
| L2c | Molecules — specialized | ⬜ |
| L3 | Flows (~7-10) | ⬜ |
| L4a | Screens — Auth + onboarding (P5) | ⬜ |
| L4b | Screens — Core capture (P6) | ⬜ |
| L4c | Screens — Batch + statement (P7) | ⬜ |
| L4d | Screens — History + items + insights (P8) | ⬜ |
| L4e | Screens — Trends + reports (P9) | ⬜ |
| L4f | Screens — Groups (P10) | ⬜ |
| L4g | Screens — Settings (P11) | ⬜ |
| L4h | Screens — Edge states (P12) | ⬜ |
| L5 | Catalog + cross-refs + handoff | ⬜ |

---

## 2. Atoms (Phase L1)

Full per-atom catalog with selector convention + verification notes lives at [`atoms/INDEX.md`](atoms/INDEX.md). Compact table here for the root-level overview.

| Atom | Source (frontend/) | Mockup file | States | Used by molecules | Status |
|---|---|---|---|---|---|
| **button** | inlined JSX (no `Button.tsx`); `features/transaction-editor/*` | [atoms/button.html](atoms/button.html) | 5 variants × 3 sizes × hover/disabled/loading | _L2_ | ✅ |
| **input** | `CategoryLearningPrompt.tsx`, `features/items/*` | [atoms/input.html](atoms/input.html) | 5 types × 3 sizes × default/filled/focus/error/disabled | _L2_ | ✅ |
| **select** | `LocationSelect.tsx` (button-trigger = molecule); native in settings | [atoms/select.html](atoms/select.html) | 3 fillings × default/selected/disabled | _L2_ | ✅ |
| **pill** | `features/history/*`, `features/insights/*` | [atoms/pill.html](atoms/pill.html) | 6 variants + with-icon | _L2_ | ✅ |
| **badge** | `Nav.tsx`, `TopHeader.tsx` | [atoms/badge.html](atoms/badge.html) | counts × 4 variants × on-host stack | _L2_ | ✅ |
| **avatar** | `ProfileDropdown.tsx`, `Nav.tsx` | [atoms/avatar.html](atoms/avatar.html) | 5 sizes × 4 color variants × initials/img | _L2_ | ✅ |
| **chip** | `features/history/components/FilterStrip.tsx`, `features/insights/components/InsightTabs.tsx` | [atoms/chip.html](atoms/chip.html) | states + count + filter-strip + 3-tab + removable | _L2_ | ✅ |
| **skeleton** | `features/scan/components/ScanSkeleton.tsx` (canonical), `BatchProcessingOverlay.tsx` | [atoms/skeleton.html](atoms/skeleton.html) | 5 shapes × scan-card / list-item compositions | _L2_ | ✅ |
| **progress** | `BatchProcessingOverlay.tsx`, `Nav.tsx` | [atoms/progress.html](atoms/progress.html) | 3 sizes × 5 variants × 4 fill states × indeterminate | _L2_ | ✅ |
| **spinner** | `ScanSkeleton.tsx` Loader2 + many `*Overlay.tsx` | [atoms/spinner.html](atoms/spinner.html) | 3 sizes × 6 variants × inline-with-label | _L2_ | ✅ |
| **toast** | `shared/ui/Toast.tsx` (canonical, TOAST_COLORS map) | [atoms/toast.html](atoms/toast.html) | 4 variants × ARIA + animation anatomy | _L2 (queue + provider)_ | ✅ |

---

## 3. Molecules (Phase L2)

See [`molecules/COMPONENT-LIBRARY.md`](molecules/COMPONENT-LIBRARY.md) once populated.

| Molecule | Source (frontend/) | Mockup file | Variants | Atoms used | Used by screens | Status |
|---|---|---|---|---|---|---|
| _populated during L2_ | | | | | | |

---

## 4. Flows (Phase L3)

| Flow | Source path | Mockup file | Screens visited | REQs covered | Status |
|---|---|---|---|---|---|
| _populated during L3_ | | | | | |

---

## 5. Screens (Phase L4)

Grouped by `.kdbp/PLAN.md` phase mapping (P5–P12).

### 5.1 Auth + onboarding (L4a → P5)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4a_ | | | | |

### 5.2 Core capture (L4b → P6)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4b_ | | | | |

### 5.3 Batch + statement (L4c → P7)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4c_ | | | | |

### 5.4 History + items + insights (L4d → P8)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4d_ | | | | |

### 5.5 Trends + reports (L4e → P9)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4e_ | | | | |

### 5.6 Groups (L4f → P10)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4f_ | | | | |

### 5.7 Settings (L4g → P11)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4g_ | | | | |

### 5.8 Edge states (L4h → P12)

| Screen | Source view | Mockup mobile | Mockup desktop | Status |
|---|---|---|---|---|
| _populated during L4h_ | | | | |

---

## 6. Coverage gaps + drift notes

Once L5 lands, this section captures:

- Components in `frontend/` that we deliberately skipped (and why)
- Components in `docs/mockups/` that have no `frontend/` counterpart (frontend is missing the feature)
- Visual divergences between clean-slate `docs/mockups/` and this extraction (informs rebuild decisions)

See [`COMPARISON.md`](COMPARISON.md) for the full drift report (created in L5).

---

## 7. Cross-references

This folder + the clean-slate folder are siblings. Both inform the rebuild.

- Clean-slate hub: [`docs/mockups/index.html`](../mockups/index.html)
- Clean-slate INDEX: [`docs/mockups/INDEX.md`](../mockups/INDEX.md)
- Clean-slate AUDIT: [`docs/mockups/AUDIT.md`](../mockups/AUDIT.md)
- KDBP knowledge: [`.kdbp/KNOWLEDGE.md`](../../.kdbp/KNOWLEDGE.md) (architectural fragility findings)
- KDBP pending: [`.kdbp/PENDING.md`](../../.kdbp/PENDING.md) (rebuild requirements P6–P10)
