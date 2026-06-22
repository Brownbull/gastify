# Legacy Reports — Per-Timeframe Density + Two Sections (DM-34)

> From workflow w1hfwiuzw. Extends REPORTS-SPEC.md (DM-32). The user clarified:
> reports come in FOUR timeframes (weekly/monthly/quarterly/annual) with
> ESCALATING density (annual = most complete), each showing TWO sections:
> establishments (where you buy) + items (what you buy).
> Authoritative legacy: `reportYearGeneration.ts` (the rendering path).

---

## The model (the key realization)

Density escalation is **NOT a different layout per timeframe** — it is the SAME
report (`ReportDetailOverlay`) populated with progressively more/richer fields.
All four timeframes produce the same `ReportRowData` shape and render through the
same overlay.

## Full report, top → bottom (`ReportDetailOverlay`)

1. **Hero** — period label ("Total de la semana/mes/trimestre/año") + giant total
   + trend chip (`±%` vs prev period, up=red/down=green). Suppressed on first period.
2. **💡 Insight card** — `personaInsight` Rosa-friendly string (always present).
3. **🏆 Highlights card** — `highlights[]` — **monthly/quarterly/annual ONLY** (never
   weekly). Label/value rows: high/low week (monthly), high/low month (Q/annual),
   category leader, most-visits/biggest-increase.
4. **🏪 Establishments section** (`TransactionGroupsCard`) — header "Desglose por
   tipo de tienda" + a SpendingDonut (if >1 group) + a list of **CategoryGroupCard**
   (12 store rubros). Renders if `transactionGroups.length > 0`.
5. **🛒 Items section** (`ItemGroupsCard`) — header "Desglose por tipo de producto"
   + a SpendingDonut + a list of **ItemGroupCard** (9 item familias). Renders if
   `itemGroups.length > 0`.
6. *(flat fallback CategoryBreakdown — only when both group arrays empty)*

## Density escalation (field-by-field)

| | Weekly | Monthly | Quarterly | Annual |
|---|---|---|---|---|
| Hero + trend | ✅ | ✅ | ✅ | ✅ |
| 💡 Insight | ✅ | ✅ (holiday-aware) | ✅ (seasonal) | ✅ (1-2 top cats) |
| 🏆 Highlights | ❌ never | ✅ high/low week | ✅ high/low month + biggest-increase | ✅ high/low month + #1 cat |
| Persona hook (subtitle) | ❌ | ❌ | ✅ | ✅ |
| 🏪 Establishments | **top-3** by amount | **ALL** (alpha) | **ALL** | **ALL** |
| 🛒 Items | **top-3** by amount | **ALL** (alpha) | **ALL** | **ALL** |
| Max / year | 52 | 12 | 4 | 1 |
| Row bg tint | lightest | → | → | darkest |

**What each bigger timeframe ADDS:** Weekly = floor (hero + insight + top-3
establishments + top-3 items). Monthly adds the 🏆 highlights card + uncaps both
sections to ALL groups. Quarterly adds the persona-hook + richer highlights.
Annual is the richest year-in-review (most complete, completed years only).

There is **NO time-series chart** — "trend" is always a single period-over-period
delta. Escalation = breadth of groups (3→all) + richness of insight/highlight text.

## The two sections (structurally identical, two taxonomies)

- **Establishments** = WHERE you buy → 12 store rubros (supermercados, restaurantes,
  comercio-barrio, vivienda, salud-bienestar, …). Per-row store-category emoji/icon.
- **Items** = WHAT you buy → 9 item familias (food-fresh, food-packaged,
  food-prepared, salud-cuidado, hogar, …). Item rows have NO per-row icon (the one
  structural diff between the two cards).

### Group card anatomy (CategoryGroupCard / ItemGroupCard)
A colored (group-tinted) card:
- **Header**: `[emoji] [name] [%-chip translucent]` left · `[sparkline] [amount] [trend ±%]` right.
- **Line-item rows** over translucent white: `[cat icon tile] [name / count] … [%-badge] [sparkline] [amount / trend]` (items: no icon tile).

gastify reuse: this is close to the existing `ItemGroup` molecule (tone-card +
header + hairline rows) + `CategoryChip` + `Sparkline` + `TrendChange`. The
section donut = the `SpendingDonut` (DM-32).

## The hub (ReportsView) — DEFERRED for the mockup

4 collapsible accordion sections (Semanal/Mensual/Trimestral/Anual) + a year
selector; each section a count badge "N de {52/12/4/1}" + a list of ReportRows
(unread dot, G-logo, title + count pill, amount + trend, period-tinted bg) →
click opens the overlay. The screen hub is screen-assembly — model the mockup as
the **timeframe selector + the report body**, not the full accordion hub.

## Mockup rebuild plan

- A **timeframe selector** (SegmentedToggle: Semanal/Mensual/Trimestral/Anual)
  driving the density.
- A **ReportDetail** molecule = hero + insight + (highlights if M/Q/A) +
  establishments section (donut + group cards, top-3 weekly / all otherwise) +
  items section (donut + group cards).
- Reuse: `SpendingDonut`, `StatusCard` (insight/highlights), `ItemGroup`-style
  group card (or a new `ReportGroupCard`), `MetricCard`/`StatValue` (hero),
  `TrendChange`, `Sparkline`, `getCategoryToken`. Fixtures: per-timeframe group
  data (additive — store groups + item groups + highlights + insight per period).
- The spike then compares timeframes (W/M/Q/A) so the user sees density escalate.
