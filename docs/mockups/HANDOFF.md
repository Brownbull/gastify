# gastify Design-Lab — Handoff

> Phase-10 handoff for the `design-lab/` mockup workspace. Audience: the **web/**
> rebuild and the **mobile/** (Expo/RN) app. This is the bridge between the
> approved design system and the two production targets.
>
> Status (2026-06-25): atoms ✅ · molecules ✅ · organisms ✅ · screens ✅ · flows ✅
> · gates ✅. Storybook **222 tests green**. The mockups are the source of truth for
> look, structure, and component contracts; production wires real data behind them.

---

## 1. What design-lab is

A standalone **React 19 + Vite + Tailwind 4 + Storybook 10** workspace that renders
every gastify screen at production fidelity across **mobile / tablet / desktop**
device frames. It owns *presentation* only — fixtures stand in for the API. The
visual language is **Playful Geometric** (DM-1): violet primary, amber/pink/emerald
accents, cream canvas, slate-900 ink, with 2–3px ink borders, hard zero-blur offset
shadows, extrabold Outfit, and framed device surfaces.

**Stack:** React 19 · Vite 7 · Tailwind 4 (CSS-first `@theme`) · Storybook 10 +
addon-vitest (browser-mode Playwright) · TypeScript · ECharts (Sankey only).

---

## 2. The token system — the single source

The whole design language is driven by one file and a generator:

```
shared/design-tokens.ts          ← SINGLE SOURCE (TS: palette, colors, fontSize, radius, spacing, shadow, motion)
   │  npm run generate:tokens     (design-lab/scripts/generate-tokens-css.mjs)
   ▼
design-lab/src/styles/tokens.css ← GENERATED :root vars + @theme inline (do not hand-edit)
   ▼
gt-* Tailwind utilities          ← bg-gt-primary, gap-gt-10, rounded-gt-xl, text-gt-md, shadow-gt-sm, ease-gt-bounce …
```

**Never hand-edit `tokens.css`** — edit `shared/design-tokens.ts` and regenerate.

`@theme` namespaces (the only valid `gt-*` suffixes):

| Namespace | Count | Names |
|---|---|---|
| `--color-gt-*` | 29 | bg/bg-2/bg-3, surface, primary(/-hover/-soft), secondary, accent, success, warning, error, ink/-2/-3, line/-strong, chart-1…6, positive(/-bg), negative(/-bg), neutral(/-bg) |
| `--spacing-gt-*` | 16 | 0,2,4,6,8,10,12,14,16,20,24,28,32,40,48,64 **(off-grid 6 & 10 are first-class)** |
| `--radius-gt-*` | 11 | sm,md,lg,xl,2xl,3xl,4xl,5xl,6xl,frame,pill |
| `--text-gt-*` | 12 | xs,sm,base,md,lg,xl,2xl…7xl (font sizes) |
| `--shadow-gt-*` | 6 | xs,sm,md,lg,xl,2xl (hard zero-blur offset) |
| `--font-gt-*` | 3 | body, display, alt (body & display are both Outfit) |
| `--ease-gt-*` | 3 | out, in-out, bounce |

> **Gotcha that bit us:** spacing is a *scale*, not arbitrary px. `gap-gt-1` /
> `pt-gt-3` etc. are **silent no-ops** (the class compiles to nothing, the gap
> collapses to 0 — no error). `npm run check:token-classes` now guards this.

---

## 3. Component inventory (76)

Atomic-design layers under `design-lab/src/design-system/`:

- **assets (2)** — `PixelIcon` (renders `public/pixel-icons/*.png` 32×32; `dir` prop also serves `gustify-icons/`), icon set.
- **atoms (21)** — Button, IconButton, Chip, Badge, Input, Switch, Modal, GroupAvatar, MemberAvatar, CircularProgress, Sparkline, SegmentedToggle, MetaPill, StepperButton, AttachTile, SectionFade, … . Treatments locked in DM-3.
- **molecules (46)** — CategoryChip/CategoryLabel (config-driven, DM-4), CompactRow/CompactRowList, MerchantHeader, ItemRow/ItemGroup, TransactionTotal, PaymentChip/PaymentPicker, AddCardForm, ThumbnailBadge, SpendingDonut/DonutLegend, TreemapCell, SankeyChart, ReportGroupCard/ReportDetail, FilterSheet, EmptyState, … .
- **organisms (7)** — AppSurface (device frames), AppScaffold (header + 4-tab BottomNav/SideNav + ScanFab overlay host), Nav (AppHeader/HeaderAction), Treemap, LinkItemFlow, … .

`Button` is the canonical CTA: variants `primary · secondary · success · danger · ghost`, sizes `sm · md · lg` (lg = the tall `h-12` full-width footer CTA), `fullWidth`. All scan-flow footers use it.

---

## 4. Screen & flow inventory (40 screens · 9 features)

| Feature | Screens | Notes |
|---|---|---|
| auth | 3 | Landing, SignIn, SignUp (via `Flows/Auth`) |
| home | 1 | Inicio dashboard (Mapa/Tendencia, gravity centers) |
| purchases | 3 | PurchasesScreen (Compras), NewTransaction (manual entry), TransactionDetail |
| scan | 11 | mode chooser, single-scan (capture→processing→review→save), statement (upload→processing→reconcile→confirm→success), statements list |
| spending | 4 | SpendingScreen (Gastos), CategoryDetail, ItemsBrowse |
| settings | 12 | SettingsScreen + 10 subviews via `SettingsFlow` (Perfil, Cards, Suscripción, Límites, Memoria, Datos/privacidad, …) |
| groups | 4 | Groups, GroupDetail, InviteJoin, ShareTransactions |
| history | 1 | items history |
| notifications | 1 | notifications |

**Flow / journey stories** compose the journeys end-to-end inside the device frame:
`Flows/Scan` (SingleScan · StatementScan · unified Escanear), `Flows/Spending`
(dashboard→drill→list), plus `Features/Auth/Screens/AuthFlow` and
`Features/Settings/Screens/SettingsFlow` (menu + deep-linked subviews). *Note: flow-story
titling isn't uniform yet — Scan/Spending live under `Flows/`, Auth/Settings under their
feature; worth standardizing under `Flows/` in a later pass.*

Navigation (DM-5): **4-tab bottom nav** (Inicio · Compras · Gastos · Perfil) + **scan FAB** (desktop next to title / mobile-tablet bottom-right). Escanear is the FAB, not a tab.

---

## 5. Running it

```bash
cd design-lab
npm run storybook        # http://localhost:6008  — inspect every component/screen/flow
npm run build            # tsc --noEmit && vite build
npm run check:mockups    # the static gates (see §6)
npm run test-storybook   # 222 browser-mode smoke tests
npm run screenshots      # capture every screen × platform → screenshots/ (gitignored)
```

Story IDs are kebab-cased titles: `features-<feature>-screens-<screen>--<story>`,
`flows-<name>--<story>`, `design-system-<layer>-<component>--<story>`.

---

## 6. Quality gates (Phase 10)

| Gate | Command | Catches |
|---|---|---|
| Token classes | `npm run check:token-classes` | `gt-*` utilities whose suffix is a silent no-op (`gap-gt-1`, namespace mismatch like `rounded-gt-10`) — parsed live from tokens.css |
| Story baseline | `npm run check:story-baseline` | feature screens not reachable in Storybook (no story + referenced by nothing storied) |
| Aggregate | `npm run check:mockups` | both static gates |
| Smoke render | `npm run test-storybook` | every story renders without error (222) |
| Visual record | `npm run screenshots` | per-platform PNGs of every screen for review/handoff |

Run `check:mockups` + `build` + `test-storybook` before any mockup commit.

---

## 7. Load-bearing decisions

Full rationale in `.kdbp/PLAN-MOCKUPS.md` (Decisions §, DM-1…DM-34). The ones a porter must honor:

- **DM-1** Single Playful Geometric theme (the old warm 3-theme×light/dark system is dropped). `shared/design-tokens.ts` is the replacement source.
- **DM-5** 4-tab nav + scan FAB (not a 5-tab bar).
- **DM-3** Atom treatments locked (Button=Pop, Badge=Flat pill, Chip=Amber, Input=Underline, IconButton=Circle).
- **DM-4** Category labels are config-driven: each taxonomy category (L1 Rubro…L4 Categoría) has a `{color, pixel-icon}` in a config file; `CategoryChip`/`CategoryLabel` read it by id.
- **DM-7..DM-13** Transaction detail + analytics diagrams (treemap/donut/sankey/trend/reports) built faithfully to legacy structure, re-skinned; diagram tint locked at `DIAGRAM_TINT = 0.5`.
- **DM-34** Reports = 4 timeframes (weekly/monthly/quarterly/annual) with escalating density, 2 sections (establishments + items); **static point-in-time snapshots** (never regenerated).

---

## 8. Porting to `web/`

The token layer was authored *for* this. To wire the mockups into the real web app:

1. **Tokens:** port `shared/design-tokens.ts` + the `generate:tokens` step into web (or import `@shared/design-tokens` directly). Web's current warm CSS vars are superseded — copy THESE values, do not match web's old ones (DM-1).
2. **Utilities:** the `gt-*` classes are pure Tailwind 4 `@theme` output — bring `tokens.css` over and the classes work verbatim. **Run `check:token-classes` in web's CI** to keep them honest.
3. **Components:** the design-system layer (atoms→molecules→organisms) is presentational and dependency-light — lift it as-is, then replace fixtures with real data hooks at the screen boundary. Component *contracts* (props) are the handoff API; keep them stable.
4. **Screens:** each `features/<f>/screens/*` is a screen surface; the `Flows/*` stories show how they compose + navigate. Swap fixture props for store/query data; keep the host-owns-state pattern (e.g. `selection`, `onOpenCategory`, `onOpenTransactions`).

---

## 9. Porting to `mobile/` — token adapter

`mobile/` (Expo/RN) currently runs the **pre-DM-1** system: `mobile/src/providers/ThemeProvider.tsx`
hardcodes a warm/professional/mono × light/dark palette and does **not** consume
`shared/design-tokens.ts`. RN has no CSS vars or Tailwind (no NativeWind installed),
so it can't use `gt-*` classes — it needs a **value adapter**.

The good news: `shared/design-tokens.ts` exports **plain TS values** (hex strings, px
numbers) that RN consumes directly. The adapter is thin:

1. **Re-point ThemeProvider** at `colors` from `@shared/design-tokens` instead of the
   local `THEMES` map. DM-1 is a *single* theme — collapse the 3-theme×mode switching
   (or keep the provider shape but feed it the one Playful Geometric palette). Map the
   shared role keys (`primary`, `surface`, `ink`/textPrimary, `chart1…6`, **plus the
   new `positive`/`negative`/`neutral`/`*-bg` roles** the mobile `ThemeColors` lacks).
2. **Spacing / radius / fontSize:** consume `spacing`, `radius`, `fontSize` objects
   directly as RN `StyleSheet` numbers (they are px-unit-agnostic by design).
3. **Shadows:** the hard zero-blur offset shadow is a CSS box-shadow — translate to RN
   per-platform (`elevation` on Android won't reproduce the offset look; consider a
   bordered/no-blur `shadowOffset` + `shadowRadius:0` on iOS, or a drawn border) and
   flag visual drift as a known platform difference.
4. **Pixel icons:** `public/pixel-icons/*.png` ship as RN `Image`/asset requires.

> Keep `shared/design-tokens.ts` as the **one** source for web + mobile + design-lab.
> If a value changes, it changes there once; web regenerates `tokens.css`, mobile
> re-reads the adapter, the lab follows automatically.

---

## 10. Consolidation map

| Concern | design-lab artifact | web/ | mobile/ |
|---|---|---|---|
| Color/space/type tokens | `shared/design-tokens.ts` | port + `generate:tokens` → tokens.css | re-point `ThemeProvider` (§9) |
| Utility classes | `gt-*` (Tailwind 4 @theme) | verbatim | N/A — adapter values |
| Atoms/molecules/organisms | `design-system/*` | lift as-is, real data at screens | re-implement in RN against the same props |
| Screens + flows | `features/*` + `Flows/*` | swap fixtures → data hooks | same screen map, RN views |
| Regression guard | `check:token-classes`, `check:story-baseline` | add to web CI | adapt token check to the adapter |

---

## 11. Known gaps / deferred

- **Mockup-only flags** still open (need a product call before web/mobile): Límites budgets data model, Sankey real edges, marketing landing, email/Apple auth, notification kinds.
- **Batch scan** deferred (archived under `scan/screens/archive/`).
- **IconButton** consolidation: a few square `h-12 w-12` X buttons remain hand-rolled (not full-width; IconButton territory).
- Reports are **static snapshots** by design — a storage/data concern, not a component one.

---

*Generated as part of Phase 10. Source of record: `.kdbp/LEDGER.md` ([MOCKUPS] entries) and `.kdbp/PLAN-MOCKUPS.md` (Decisions). The mockup lane never touches `.kdbp/PLAN.md`.*
