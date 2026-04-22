# Gastify Rebuild — UX Plan

**Date:** 2026-04-20
**Scope:** PWA only (single codebase serves mobile + desktop + installable Android home-screen app). No native iOS/Android/desktop builds.
**Status:** Planning — executes as **Workstream A** (parallel to Workstream B / Backend per ADR D18), converging at Integration.
**Handoff target:** `docs/rebuild/ux/handoff/` — consumed by the Integration phase of the ultraplan implementation.

## Why this phase exists

The architect-perspective roast resolved 13 structural decisions in [`ADR-2026-04-20-REBUILD-STACK.md`](ADR-2026-04-20-REBUILD-STACK.md). The UX-perspective roast surfaced 17 additional gaps — none of which contradict the architecture but all of which must be resolved before integration. Building the frontend without a design contract guarantees rework when UX reality meets the backend.

**Parallelism note (D18):** This UX work is **Workstream A** and runs in parallel with Workstream B (backend infrastructure). Workstream B uses simulated frontend payloads (pytest fixtures + OpenAPI contracts + sandbox-mode Gemini) to validate the API without waiting for real UI. The two workstreams converge at the Integration phase, where the UX handoff drives the actual frontend build that connects to the already-tested backend.

This plan does two things:
1. **UX Decisions already made** (Section 1) — captures resolutions to the UX roast gaps so they don't re-surface later
2. **UX Execution Pipeline** (Section 2) — the 7-phase pipeline that turns those decisions into implementation-ready designs

---

## Section 1 — UX Decisions (resolved 2026-04-20)

Each numbered item below matches a gap from the UX roast. "Agreed" = proceed with the roast's suggested fix as-stated. "Clarified" = proceed with a variant explained inline.

### Agreed as proposed

| ID | Decision |
|---|---|
| **UX-1** (was M1) | **Scan progress UX.** SSE events map to visual states: `queued → "Uploading..."` skeleton; `picked_up → "Reading receipt..."` skeleton with cycling narrative (3-4 phrases on 3s rotation); `gemini_start → narrative loop`; `gemini_end → "Organizing items..."`; `completed → result view`; `failed → error state with refund confirmation`. No bare spinners. |
| **UX-2** (was M2) | **First-run onboarding.** Three screens: (1) welcome + "10 free scans" bubble, (2) scan demo with pre-loaded sample receipt the user taps through, (3) home screen with empty-state CTA "Scan your first receipt." Skip for migrated users. |
| **UX-3** (was M3) | **Credit system UX.** Persistent counter in header; subtle "−1 credit" animation on successful scan; "You have 0 credits — buy more?" modal when balance insufficient; credit-refund toast on scan failure ("Credit refunded — scan failed"). |
| **UX-5** (was M5) | **Error UX taxonomy.** Backend error codes map to user-facing messages with recovery CTAs. See table in Section 2 / Phase U5. |
| **UX-7** (was M7) | **Accessibility: WCAG 2.1 AA target.** Keyboard-reachable controls, semantic HTML, `aria-live="polite"` for SSE progress, `prefers-reduced-motion` honored, verified contrast per theme, `font_size` via rem scaling. |
| **UX-9** (was M9) | **Theme preview.** Settings shows a live preview card (sample transaction + chart) that updates as user adjusts theme/font. Cross-product combinations tested; prohibited combos warned. Migrated theme preferences imported from Firestore as-is. |
| **UX-10** (was M10) | **Currency display rules.** Native currency primary ("$25,750" for CLP, "$25.50" for USD); locale-aware separators; optional "(≈ $X USD)" secondary label in mixed-currency analytics; never show `amount_usd_minor` as primary. |
| **UX-12** (was M12) | **Cross-app UX (Gustify).** Settings toggle "Share food items with Gustify" (default on if user has Gustify account detected via `GET /gustify/v1/user-exists?email=X`; off otherwise). Food-candidate items show a small fork/knife icon. |
| **UX-13** (was M13) | **Empty states per view.** Each list/dashboard specifies heading + illustration + primary CTA (Analytics → "Scan your first receipt to see trends"; Items filtered → "No items match 'X'. Clear filter?"; Notifications → "You're all caught up"). |
| **UX-E2** | **Push notification taxonomy.** Opt-in per type: `scan_completed` (default off), `scan_failed_async` (default on), `weekly_summary` (default off), `budget_alert` (future). Per-type toggles in settings. |
| **UX-E3** | **Loading-state hierarchy.** (1) Skeleton for initial content; (2) spinner for in-place refresh <1s; (3) narrative progress for >5s (per U5); (4) optimistic UI for mutations. Codified in the component library. |
| **UX-E4** | **PWA gesture inventory.** Pull-to-refresh on lists, swipe-to-delete on transaction rows (with undo toast), long-press for multi-select, edge-swipe back. Every gesture has a button-path accessible alternative. |
| **UX-S1** | **Namespaced preferences JSONB.** `{ notifications: {...}, privacy: {...}, display: {...}, scan_defaults: {...} }`. Each namespace = one settings tab. `schema_version` field for independent migrations. |

### Clarified

#### UX-4 (was M4) — Category learning UX: preserve current behavior
- **Decision:** Match current app's pattern. Learned mappings are **asked** to the user on first application — no silent auto-apply. Once confirmed, mappings are saved at the user level and auto-apply on future scans.
- **Management:** Settings → "Learned Mappings" screen lists saved merchant→category and item→category mappings with **delete** action. No edit (delete + re-learn on next scan).
- **Why:** The current flow works; users understand it; no need to redesign.
- **Implication for schema:** No change to `merchant_category_mappings` / `item_category_mappings` as specified in the ADR. Confidence scoring used internally but not surfaced in UI.

#### UX-6 (was M6) — Batch Review UX: preserve current behavior
- **Decision:** Replicate current app's Batch Review flow exactly. No redesign.
- **Scope:** Applies to both multi-receipt scans and statement scans (many transactions from one PDF).
- **Action:** Reference current implementation in `src/features/scan/` during Phase U2 wireframing; document the existing flow rather than reinvent.

#### UX-8 (was M8) — Offline UX: banner + grayed buttons only
- **Decision:** Persistent top banner when `navigator.onLine === false`; all mutation buttons grayed out with "Requires connection" tooltip.
- **Explicitly dropped:** local-storage form draft + restore-on-reconnect from the original suggestion. Out of scope for v1.
- **Why:** Simpler MVP; matches the "view-only offline" trade-off already documented in the ADR.

#### UX-11 (was M11) — Soft-delete with 90-day edit window
- **Decision:** Agree with the soft-delete + undo toast pattern, but constrain it to transactions ≤ 90 days old.
- **Rule:** Transactions older than 90 days are **read-only** — no add, edit, or delete. This is a deliberate design choice to avoid recomputing statistics for historical periods; older months are frozen.
- **Implication:**
  - Schema: add `deleted_at TIMESTAMPTZ` for soft-delete of recent rows
  - UI: edit/delete actions disabled with tooltip "Transactions older than 90 days are read-only" on rows where `date < now() - interval '90 days'`
  - Trash view (settings): 30-day retention before hard delete, as originally proposed
  - Statistics for periods > 90 days are treated as immutable snapshots
- **Revisit when:** Statistics recomputation becomes cheap enough (materialized views + incremental refresh) to support edits on historical data.

#### UX-E1 — i18n coverage: names as-scanned, categories English-canonical
- **Merchant names:** stored exactly as Gemini returns them from the scan (whatever language the receipt is in). Never auto-translated.
- **Item names:** same — stored as scanned. Never auto-translated.
- **Categories (L1/L2/L3/L4):** always stored as English PascalCase keys. Gemini prompt enforces English output per taxonomy spec.
- **Pydantic enforcement:** `output_type` on the Gemini call validates all category keys against the English enum. Non-English values rejected at parse time; worker retries with a clarifying prompt or falls back to `Other`/`OtherItem`. This aligns with **U4 — Enforce Output Structure Mechanically**.
- **Frontend display:** reads the `display[locale]` map from `shared/categories.json` (defined in ADR D5) to show category labels in the user's preferred locale. Toggling locale changes category display instantly without refetching data.

---

## Section 2 — UX Execution Pipeline (7 phases)

Execute sequentially before backend implementation. Tool preference: **Claude Design** (launched 2026-04-17, Anthropic Labs product, available to Claude Pro/Max/Team/Enterprise). Fallback: local HTML mockups (same pattern used in Epic 17 mockup work — see `docs/mockups/` in sibling projects).

### Phase U0 — User Journey Inventory (1 day)

**Goal:** catalog every user-facing flow in the current app; decide per flow whether to preserve, redesign, or remove.

**Tasks:**
1. List every flow in current BoletApp. Sources: `src/features/*/`, route tree, current app walkthroughs.
2. Classify each: `preserve` / `redesign` / `new` / `remove`.
3. For `new` flows, describe the trigger and outcome.

**Journeys to inventory (starter list — expand during U0):**
- J1: First-time user onboarding (covers UX-2)
- J2: Sign in (Google OAuth, returning user)
- J3: Scan single receipt → QuickSave
- J4: Scan single receipt → Editor → Save
- J5: Batch scan (multiple receipts) → Batch Review → Save
- J6: Statement scan (PDF → multiple transactions) → Batch Review → Save
- J7: View analytics (period picker, category breakdown, trends)
- J8: Edit transaction (within 90-day window)
- J9: Delete transaction (soft-delete + undo) (covers UX-11)
- J10: View Items aggregated view
- J11: Cross-app: food item appears in Gustify (covers UX-12)
- J12: Credit balance depleted → buy more (stub for v1) (covers UX-3)
- J13: Scan fails → error recovery (covers UX-5)
- J14: Settings: theme/font/locale/currency (covers UX-9, UX-10, UX-S1)
- J15: Settings: learned mappings management (covers UX-4)
- J16: Offline: view transactions (covers UX-8)
- J17: Notifications: receive + manage (covers UX-E2)

**Deliverable:** `docs/rebuild/ux/USER-JOURNEYS.md` — numbered flows, each with trigger / steps / outcome / decision.

### Phase U1 — Information Architecture (0.5 day)

**Goal:** map all screens + navigation before designing any of them.

**Tasks:**
1. Screen inventory (full list: one line per screen)
2. Navigation map — 5-slot bottom nav from `navigation-restructure-plan.md`; what lives in each slot
3. Modal vs full-screen decisions (e.g., Editor = full-screen; Credit-purchase = modal)
4. URL structure (deep-linkable paths — the rebuild is a PWA, each screen should have a URL)

**Deliverable:** `docs/rebuild/ux/IA.md` with screen list + navigation diagram (mermaid OK) + URL map.

### Phase U2 — Low-fi Wireframes (2-3 days)

**Goal:** structure every screen (no visual polish yet) with all states annotated.

**Tool:** Claude Design.

**Starter prompt for Claude Design (paste into the Claude Design product):**
```
Build low-fidelity wireframes for Gastify, a Chilean smart expense-tracker PWA.
Style: structural only — grayscale, no colors, no imagery, no final typography.
Canvas: mobile-first (390×844), plus desktop breakpoint (1280×800) for dashboard.

Context:
- Read my current app at [link to current BoletApp hosted URL or repo]
  to mirror existing flows where we're preserving behavior.
- 17 user journeys defined in USER-JOURNEYS.md (attached)
- Navigation: 5-slot bottom nav (Home, Scan, Transactions, Analytics, Settings)
- Rebuild target: FastAPI + PostgreSQL backend with SSE for scan progress

For each screen, annotate:
- Default state (populated)
- Empty state (no data)
- Loading state (skeleton)
- Error state (with recovery CTA)
- Offline state (banner + grayed-out mutation buttons)

Deliverables: one wireframe per screen in USER-JOURNEYS.md, grouped by journey.
Export: PNG per screen + exportable Claude Design project URL.
```

**Tasks:**
1. Generate wireframes via Claude Design using the prompt above + USER-JOURNEYS.md as context
2. Iterate via conversation until each screen has all 5 states annotated
3. Export PNGs to `docs/rebuild/ux/wireframes/`

**Fallback if Claude Design insufficient:** build static HTML mockups in `docs/rebuild/ux/wireframes/` following the same pattern used in `docs/mockups/` in sibling projects. Tailwind OK; no JS required — these are structural.

**Deliverable:** wireframes for every screen with all 5 states.

### Phase U3 — Component Library (1-2 days)

**Goal:** extract reusable building blocks AFTER screens exist (learned from architect-roast M2: components-before-screens produces hypothetical components).

**Tool:** Claude Design.

**Starter prompt:**
```
Analyze these wireframes (attached from Phase U2). Extract reusable components.
Produce a component library with these atomic pieces at minimum:
- Buttons (primary, secondary, destructive, disabled, loading)
- Transaction card (compact, expanded states)
- Amount display (CLP format, USD format, mixed-currency)
- Category chip (L2 store category, L4 item category, with locale display)
- Chart primitives (bar, pie, line — analytics views)
- Form fields (text, number, date picker, currency input, category picker)
- Empty state block (heading + illustration slot + CTA)
- Loading skeleton (card variant, list variant, chart variant)
- Error banner (info, warning, error, success)
- Offline banner
- Credit counter (header component)
- Progress narrative (SSE scan progress component — cycling text + skeleton)
- Bottom navigation (5-slot)

For each component: list props, states, accessibility notes, usage examples.
```

**Tasks:**
1. Extract components from Phase U2 wireframes
2. Verify every screen in the IA uses only library components (no one-offs)
3. Document props + states per component

**Deliverable:** Claude Design component library + `docs/rebuild/ux/COMPONENTS.md` summary.

### Phase U4 — Hi-fi Mockups (3-5 days)

**Goal:** apply visual design to wireframes + components.

**Tool:** Claude Design.

**Inputs:**
- Wireframes from U2
- Component library from U3
- Current app theme system (44+ Tailwind variants, light/dark × mono/normal/professional × font-family × font-size)

**Starter prompt:**
```
Apply visual design to the wireframes + component library (attached).
Base theme: "normal" variant, light mode, system font, medium size.
Chilean Spanish as primary locale (all text in ES where applicable).

Variants to produce per screen:
- Light + dark mode
- "normal" + "professional" color themes (skip "mono" — similar to normal)
- Default + XL font size (accessibility check)

Constraints:
- WCAG 2.1 AA contrast on every combination
- Max width 640px on mobile, responsive up to 1280px
- PWA (no native OS chrome); design the top bar to match
- Preserve brand feel of current app where possible (reference the live URL)
```

**Tasks:**
1. Generate hi-fi mockups per screen × theme variant
2. Verify WCAG AA on each variant (automated via Claude Design's built-in tools + manual spot-checks)
3. Export mockups to `docs/rebuild/ux/mockups/`

**Deliverable:** hi-fi mockups for every screen in primary theme variants.

### Phase U5 — Interaction & Motion Specs (1 day)

**Goal:** document gestures, animations, loading patterns — everything that's not a static image.

**Tasks:**
1. Gesture inventory per screen (pull-to-refresh, swipe-to-delete, long-press)
2. Animation specs (scan progress narrative rotation timing, transaction save confirmation, toast durations, theme-switch transition)
3. Loading-state decision tree (when skeleton vs spinner vs narrative vs optimistic)
4. Error UX taxonomy table mapping backend error codes → user messages → recovery CTAs:

| Backend code | User message (ES primary) | User message (EN) | Recovery CTA |
|---|---|---|---|
| `gemini_parse_failed` | "No pudimos leer este recibo claramente." | "We couldn't read this receipt clearly." | "Retomar foto" / "Retake photo" |
| `ai_unavailable` (breaker open) | "Nuestra IA está brevemente saturada. Crédito devuelto." | "Our AI is briefly overloaded. Credit refunded." | "Reintentar en 2 min" / "Try in 2 min" |
| `insufficient_credits` | "Sin escaneos disponibles." | "Out of scans." | "Comprar créditos" / "Buy credits" |
| `worker_timeout` | "El escaneo tomó demasiado. Crédito devuelto." | "Scan took too long. Credit refunded." | "Probar imagen más nítida" / "Try a clearer image" |
| `offline` | "Sin conexión. Solo lectura." | "Offline. View only." | (dismiss only) |
| `gemini_quota_exhausted` | "Límite alcanzado, inténtalo pronto." | "Limit reached, try again soon." | (auto-retry with backoff) |

**Deliverable:** `docs/rebuild/ux/INTERACTIONS.md`.

### Phase U6 — Accessibility Review (1 day)

**Goal:** WCAG 2.1 AA pass on every screen before handoff.

**Tasks:**
1. Keyboard navigation audit — tab order, focus rings, skip links
2. Screen reader labels — every interactive element has accessible name
3. Contrast check — every theme × mode combination tested via automated tool
4. Reduced motion alternatives — for every animation, specify the `prefers-reduced-motion` fallback
5. Font scaling — verify layouts at 200% zoom don't break
6. Touch targets — minimum 44×44 px on mobile

**Deliverable:** `docs/rebuild/ux/A11Y-CHECKLIST.md` with pass/fail per screen + remediation notes.

### Phase U7 — Dev Handoff Bundle (0.5 day)

**Goal:** package everything Claude Code needs to implement the designs.

**Tool:** Claude Design's export-to-Claude-Code handoff bundle.

**Bundle contents:**
- Hi-fi mockups per screen (PNG + inspectable source)
- Component library spec (props + states + accessibility)
- Design tokens (colors, typography, spacing, shadows, motion timings)
- Interaction specs (from U5)
- Accessibility checklist (from U6)
- `README.md` linking everything together

**Tasks:**
1. Export Claude Design project as handoff bundle
2. Save to `docs/rebuild/ux/handoff/`
3. Update `docs/rebuild/ultraplan-rebuild-prompt.md` to reference the handoff bundle as Phase-0 input
4. When `/ultraplan` runs, the resulting implementation plan starts with "read handoff bundle" rather than "design UI from scratch"

**Deliverable:** complete `docs/rebuild/ux/handoff/` folder + prompt update.

---

## Timeline

Sequential execution, solo dev, ~2 weeks total:

| Week | Phases | Days |
|---|---|---|
| 1 | U0 + U1 + U2 + U3 | 4.5 |
| 2 | U4 + U5 + U6 + U7 | 5.5 |

Slack: 2 extra days for iteration on whichever phase is hardest (usually U4 hi-fi mockups). If Claude Design's research preview runs out of quota or produces insufficient quality, add 3-4 days for HTML-mockup fallback.

## Revisit Triggers

- Claude Design v1 doesn't handle a specific pattern well → document which patterns needed HTML fallback; update this plan for the next rebuild effort
- During implementation, a hi-fi mockup turns out to be non-buildable → return to Phase U4 for that screen only; don't re-run the full pipeline
- Second user joins Gastify and discovers a flow that doesn't match their mental model → return to Phase U0 to add a new journey; iterate downstream only for that journey

## References

- [`ADR-2026-04-20-REBUILD-STACK.md`](ADR-2026-04-20-REBUILD-STACK.md) — architecture decisions this UX plan sits on top of
- [`ultraplan-rebuild-prompt.md`](ultraplan-rebuild-prompt.md) — the prompt that will consume this UX handoff as Phase-0 input
- Current app at repo root — source of truth for "preserve current behavior" decisions (UX-4, UX-6, UX-9)
- [Claude Design product page](https://www.anthropic.com/news/claude-design-anthropic-labs) — primary tool
- Epic 17 mockup work in sibling projects under `docs/mockups/` — fallback pattern reference
