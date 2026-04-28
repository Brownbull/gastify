# mockups-legacy — Catalog

Living index for the operational-frontend extraction. Mirrors the structure of [`docs/mockups/INDEX.md`](../mockups/INDEX.md) but populated from `frontend/src/`.

**Source of truth:** the React port at [`frontend/`](../../frontend/).
**Active plan:** `~/.claude/plans/at-this-stage-maybe-sunny-wall.md`
**Last updated:** 2026-04-27 (Phase L2a — batch 2: 4 cards landed; total 7 of ~18 molecules · D23 file-triple cascade applied to all 7)

---

## 1. Phase status

| Phase | Description | Status |
|---|---|---|
| L0 | Foundation: tokens, hub, tooling | ✅ exec |
| L1 | Atoms (11) | ✅ exec · ⬜ review/commit/push |
| L2a | Molecules — direct counterparts (~18) | 🔄 7 of ~18 — batches 1-2 done (banner / state-tabs / toast-system + card-transaction / card-stat / card-empty / card-celebration); card-feature deferred (no live source) |
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
| **button** | inlined JSX (no `Button.tsx`); `features/transaction-editor/*` | [atoms/button.html](atoms/button.html) | 5 variants × 3 sizes × hover/disabled/loading | [banner](molecules/banner.html), [card-empty](molecules/card-empty.html) | ✅ |
| **input** | `CategoryLearningPrompt.tsx`, `features/items/*` | [atoms/input.html](atoms/input.html) | 5 types × 3 sizes × default/filled/focus/error/disabled | _L2_ | ✅ |
| **select** | `LocationSelect.tsx` (button-trigger = molecule); native in settings | [atoms/select.html](atoms/select.html) | 3 fillings × default/selected/disabled | _L2_ | ✅ |
| **pill** | `features/history/*`, `features/insights/*` | [atoms/pill.html](atoms/pill.html) | 6 variants + with-icon | _L2_ | ✅ |
| **badge** | `Nav.tsx`, `TopHeader.tsx` | [atoms/badge.html](atoms/badge.html) | counts × 4 variants × on-host stack | _L2_ | ✅ |
| **avatar** | `ProfileDropdown.tsx`, `Nav.tsx` | [atoms/avatar.html](atoms/avatar.html) | 5 sizes × 4 color variants × initials/img | _L2_ | ✅ |
| **chip** | `features/history/components/FilterStrip.tsx`, `features/insights/components/InsightTabs.tsx` | [atoms/chip.html](atoms/chip.html) | states + count + filter-strip + 3-tab + removable | _L2_ | ✅ |
| **skeleton** | `features/scan/components/ScanSkeleton.tsx` (canonical), `BatchProcessingOverlay.tsx` | [atoms/skeleton.html](atoms/skeleton.html) | 5 shapes × scan-card / list-item compositions | _L2_ | ✅ |
| **progress** | `BatchProcessingOverlay.tsx`, `Nav.tsx` | [atoms/progress.html](atoms/progress.html) | 3 sizes × 5 variants × 4 fill states × indeterminate | _L2_ | ✅ |
| **spinner** | `ScanSkeleton.tsx` Loader2 + many `*Overlay.tsx` | [atoms/spinner.html](atoms/spinner.html) | 3 sizes × 6 variants × inline-with-label | _L2_ | ✅ |
| **toast** | `shared/ui/Toast.tsx` (canonical, TOAST_COLORS map) | [atoms/toast.html](atoms/toast.html) | 4 variants × ARIA + animation anatomy | [toast-system](molecules/toast-system.html) | ✅ |

---

## 3. Molecules (Phase L2)

See [`molecules/SCREEN-USAGE.md`](molecules/SCREEN-USAGE.md) for live screen-usage trace (per-molecule mapping to top-level views, with speculative variants flagged). [`molecules/COMPONENT-LIBRARY.md`](molecules/COMPONENT-LIBRARY.md) lands at end of L2c.

> **D23 file-triple convention** (2026-04-27, applied to all 7 L2a molecules and all subsequent molecules + L4 screens). Each molecule below ships as four files:
> - `molecules/<slug>-mobile.html`   — wraps demo in `.screen-phone` (390 × 844)
> - `molecules/<slug>-tablet.html`   — wraps demo in `.tablet-surface` (820 × 1180 portrait)
> - `molecules/<slug>-desktop.html`  — wraps demo in `.desktop-surface` (1120 × 720)
> - `molecules/<slug>.html`          — landing page with 3 platform-variant cards + composition crossrefs
>
> The "Mockup file" column links the landing page; the platform variants are reachable from there. The Tweaks panel viewport switcher is retired — open the platform file directly. Surface-scoped CSS lives in [`assets/css/molecules.css`](assets/css/molecules.css) under "Platform surface overrides (D18)". Atoms remain single-file (no platform split). See [`.kdbp/DECISIONS.md` § D23](../../.kdbp/DECISIONS.md) for the full rationale.

| Molecule | Source (frontend/) | Mockup file | Variants | Atoms used | Used by screens | Status |
|---|---|---|---|---|---|---|
| **banner** | `features/batch-review/views/BatchCaptureCreditSection.tsx` · `features/scan/components/ScanError.tsx` · `hooks/app/useOnlineStatus.ts` | [molecules/banner.html](molecules/banner.html) | info / warning / error / offline (edge-bleed) | [button](atoms/button.html) | _L4_ | ✅ |
| **state-tabs** | `features/items/components/ItemViewToggle.tsx` (canonical) · ChartModeToggle · DrillDownModeToggle · InsightsCarousel | [molecules/state-tabs.html](molecules/state-tabs.html) | pill (sliding indicator) / simple flat · 2-5 slot · ARIA + legacy shape | none (primitive) | _L4_ | ✅ |
| **toast-system** | `shared/ui/Toast.tsx` (atom) · `shared/hooks/useToast.ts` (single-toast queue) · `App.tsx` (mount) | [molecules/toast-system.html](molecules/toast-system.html) | success / info / warning / error · single-toast · 3s/6s auto-dismiss · is-leaving exit | [toast](atoms/toast.html) | scan / edit / settings / cross-cut | ✅ |
| **card-transaction** | `components/transactions/TransactionCard.tsx` (consolidated, Story 14.15b) | [molecules/card-transaction.html](molecules/card-transaction.html) | default · selection-mode · expanded · duplicate-flagged · grouped (9-state matrix) | none directly (inline meta-pill) | scan / dashboard / history | ✅ |
| **card-stat** | `features/items/components/AggregatedItemCard.tsx` | [molecules/card-stat.html](molecules/card-stat.html) | default · clickable · with-action-pill · long-text-truncation | none directly (inline meta-pill) | items | ✅ |
| **card-empty** | `features/history/components/HistoryEmptyStates.tsx` (canonical, 2 sub-states) · `features/items/views/ItemsView/ItemsViewEmptyState.tsx` | [molecules/card-empty.html](molecules/card-empty.html) | primary (with CTA) · filter-empty · filter-empty-duplicates · scale-large · scale-small | [button](atoms/button.html) (CTA only) | history / items | ✅ |
| **card-celebration** | `components/celebrations/PersonalRecordBanner.tsx` · `useCelebration.ts` (dispatch) · `features/insights/components/CelebrationView.tsx` (placeholder host) | [molecules/card-celebration.html](molecules/card-celebration.html) | default · streak · is-leaving (exit anim) | none directly | insights (placeholder; full system pending Story 14.33d) | ✅ |
| _remaining ~11 L2a molecules + card-feature deferred_ | | | | | | ⬜ |

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
