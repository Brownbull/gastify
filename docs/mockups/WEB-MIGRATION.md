# Web Migration — Kickoff

> Sequenced plan for bringing the **Playful Geometric** design system (built in
> `design-lab/`, Phases 1–10) into the **live `web/` app**. Read alongside
> [HANDOFF.md](./HANDOFF.md) (the *what* + token system) — this doc is the *how*
> (the order, the decisions, the risks). Intended to be picked up by a fresh,
> properly-planned session.

---

## 0. Why now / preconditions (all ✅)

- **Mockup project complete** — `design-lab/` Phases 1–10: 76 components · 40 screens · 4 flows · 222 storybook tests · gates · handoff.
- **Real lane (PLAN.md) DONE** — all 5 phases (rate-limiting + D96 tier/quota) shipped to production; *"Scale-tier rows 11-16 deferred (P86)"*. Nothing mid-flight.
- **Working tree clean** — no uncommitted WIP. The other session halted at a clean, fully-shipped seam to build the mockups.

This is a clean moment to open a **new PLAN.md epic** for the web migration. It is *not* mockup-lane work — it belongs in the real plan.

---

## 1. Current `web/` state (the target of migration)

| Aspect | Reality |
|---|---|
| Stack | React 19 · Vite 8 · **Tailwind 4** · TanStack Router (file-based) · TanStack Query · zustand · Firebase auth · i18n (Spanish) — **same core stack as design-lab** |
| Routes (`web/src/routes/`) | `index` (dashboard), `transactions[.index/.new/.$id]`, `items`, `trends`, `reports`, `scan`, `scan-batch`, `statements`, `groups`, `invite.$token`, `notifications`, `settings`, `sign-in` — ~14 screens |
| Data layer | TanStack Query hooks (`useTransactions`, `useItems`, `useInsights`, `useScanStream`, `useQuota`, …) + `lib/api.ts` (typed from `openapi-spec.json`) + `useAuth` (firebase) + `useI18n` |
| Components | `AppLayout` (shell), `GroupSwitcher`, `NotificationBell`, `Scan*`, `BatchScan*`, `StatementReconciliationPanel`, `charts/`, `insights/`, `reports/`, … |
| **Styling** | **669 inline `var(--*)` usages** (e.g. `style={{ color: 'var(--primary)' }}`) — web styles off the SEMANTIC CSS vars, NOT Tailwind utility classes. Only ~20 files use `className` meaningfully. |
| Theme | `web/src/styles/global.css` = warm **3-theme (normal/professional/mono) × light/dark**, switched via `data-theme` + `.dark`, controlled from `settings.tsx` + `uiStore.ts`. **No `@theme` block, no `gt-*` utilities.** |

### The single most important fact
Because web styles via inline `var(--primary)`/`var(--surface)`/etc., and those var **names are identical** to the ones `shared/design-tokens.ts` emits, **swapping the `:root` values in `global.css` to the Playful Geometric palette auto-recolors all 669 usages** with near-zero component edits. The *palette* is cheap. The geometric *grammar* (ink borders, hard zero-blur shadows, extrabold type, framed surfaces, the radius/spacing rhythm, the actual component shapes) is NOT — that's real component work.

### The data layer is safe
The migration is **view-only**. TanStack Query hooks, `api.ts`, i18n, firebase, the stores — all stay. design-lab screens are presentational; wire them to the existing hooks. No backend/API change.

---

## 2. Three decisions to confirm (with recommendations)

**D-A · Depth: palette-only vs full design-system adoption.**
- *Palette-only* — swap token values; app recolors to violet/cream but keeps its current layout/grammar. Fast, shallow; web won't look like the mockups.
- *Full adoption* — adopt the geometric grammar + port the design-lab components/screens. Matches the mockups; large effort.
- **Recommend: Full adoption, sequenced** — token foundation first (immediate recolor + gt-* available), then grammar + components screen-by-screen. The mockups *are* the target; palette-only would leave web structurally old.

**D-B · Theme system: single theme vs keep the 3-theme switcher.**
- DM-1 is a **single** Playful Geometric theme. Keeping the normal/professional/mono × dark switcher contradicts the identity and multiplies work.
- **Recommend: Single theme.** Drop the switcher UI in `settings.tsx`, retire `data-theme`/`.dark` branches in `global.css` (+ the theme bits of `uiStore.ts`). **Defer dark mode** (design-lab has no dark variant — light only for now; revisit later if wanted).

**D-C · Rollout: big-bang vs incremental.**
- The other session is halted, so concurrency risk is low — big-bang is *less* risky than first feared. But 14 screens + components is a lot to flip atomically.
- **Recommend: Incremental** — token foundation (whole-app recolor) → app shell/nav → screen-by-screen, each shippable. Continuous proof, easy rollback per screen.

---

## 3. Phased roadmap (proposed PLAN.md epic)

> Each phase ends with: `tsc` + `vite build` green · Vitest green · **Playwright visual proof** (per the standing "frontend changes need UI proof" rule) · `/gabe-commit`.

**W1 · Token foundation (the big visual milestone, small diff).**
Port `shared/design-tokens.ts` into web's build (import `@shared/design-tokens` or copy the generator). Generate `web/src/styles/tokens.css` = the Playful Geometric `:root` values + the `@theme inline` `gt-*` mapping; replace the warm theme section of `global.css` (keep `@import "tailwindcss"`, the reset, body). Apply D-B (collapse to single theme). **Outcome:** the 669 inline `var(--*)` recolor to Playful Geometric; `gt-*` utilities exist for the work ahead. Wire `check:token-classes` into web. *No component rewrites yet — just confirm nothing renders broken in the new palette.*

**W2 · App shell + navigation (geometric grammar).**
Port the AppScaffold/Nav organisms: 4-tab BottomNav (Inicio·Compras·Gastos·Perfil) + ScanFab (DM-5), AppHeader, the framed surface treatment — adapted to TanStack Router (the tabs are `<Link>`s). Replace `AppLayout`. Establishes the geometric shell every screen sits in.

**W3…Wn · Screen-by-screen port (one phase per screen or cluster).**
Suggested order (low-risk → high-value): **settings → notifications → transactions(list+detail+new) → items → scan(single+batch+statements) → trends/spending(donut/treemap/sankey) → reports → groups → dashboard(index)**. For each: rebuild the route's UI from the matching design-lab screen + components, wired to the existing hooks; port the design-system atoms/molecules it needs (lift presentational code from design-lab). Carry the interaction models decided in the mockups (e.g. Gastos: icon→detail, count→history).

**Wf · Cleanup + proof.**
Remove the dead warm-palette CSS + theme switcher; delete superseded web components; full Playwright visual-regression sweep across routes × (mobile/desktop); update e2e; confirm `check:token-classes` in CI.

---

## 4. Risks / watch-list

- **Inline `var()` vs `gt-*` drift** — web mixes inline-var styling with the new utility classes during the transition. Decide per component: keep inline `var()` (auto-recolored) for untouched screens, adopt `gt-*` when a screen is ported. Don't half-convert a file.
- **No dark mode in design-lab** — if web users rely on dark, flag it; design-lab is light-only (D-B defers dark).
- **Charts** — web has its own `charts/` (recharts? d3?) vs design-lab's ECharts-Sankey + hand-built donut/treemap. The analytics screens are the heaviest port; budget extra.
- **Responsive** — design-lab screens are device-framed (mobile/tablet/desktop via AppSurface); web is a real responsive app. Port the *content/structure*, not the AppSurface frame; map design-lab's platform breakpoints to web's real layout.
- **i18n** — design-lab hardcodes Spanish UI strings; web routes them through `useI18n`. Move ported strings into the i18n layer (don't hardcode).
- **Tests** — web has route tests + e2e; keep them green per screen, update snapshots intentionally.

---

## 5. What's ready for the next session

- `design-lab/` — the full reference implementation (run `npm run storybook`), the token source (`shared/design-tokens.ts`), and the gates (`check:token-classes`, `check:story-baseline`, `screenshots`).
- [HANDOFF.md](./HANDOFF.md) — token system, component/screen inventory, decisions (DM-1…DM-34), web + mobile port guidance, consolidation map.
- This doc — the sequenced plan + the three decisions.
- A clean tree on a fully-shipped real lane.

**First action for the new session:** confirm D-A/D-B/D-C with the user, then run `/gabe-plan` to formalize this roadmap as a new PLAN.md epic (tier per phase), and `/gabe-execute` W1.
