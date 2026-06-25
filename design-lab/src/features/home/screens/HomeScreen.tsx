import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Badge } from "@design-system/atoms/Badge";
import { StatusCard } from "@design-system/molecules/StatusCard";
import { PeriodNav } from "@design-system/molecules/PeriodNav";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import type { Platform } from "@design-system/organisms/AppSurface";
import { MonthTreemapCard } from "../components/MonthTreemapCard";
import { MonthTrendCard } from "../components/MonthTrendCard";
import { GravityCentersCard } from "../components/GravityCentersCard";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";
import { sampleHome, type HomeScreenModel } from "../model/HomeScreenModel";

/**
 * HomeScreen (Phase 8, DM-5) — the home dashboard CONTENT, designed to live
 * inside AppScaffold (which supplies the header / 4-tab nav / scan FAB):
 *
 *   top bar  → greeting + interactive period stepper (‹ junio 2026 ›)
 *   hero     → "gastado este mes": value + inline delta + period
 *   insight  → a single StatusCard (the "you're doing well this month" tip)
 *   treemap  → "Este Mes" category breakdown
 *   recent   → recent movements, FULL WIDTH (the established CompactRow layout)
 *
 * Deliberately lean: no quick-action shortcuts (the scan FAB covers that) and no
 * stats strip (boletas/ítems/promedio) — the total + insight are enough.
 *
 * Layout: mobile/tablet = one capped column; desktop = hero + insight in a row,
 * then the treemap and the recent list each span the full content width.
 * default / empty / loading states.
 */
export interface HomeScreenProps {
  model?: HomeScreenModel;
  loading?: boolean;
  platform?: Platform;
}

const MONTHS = ["enero 2026", "febrero 2026", "marzo 2026", "abril 2026", "mayo 2026", "junio 2026"];

function InicioHero({ model, monthLabel }: { model: HomeScreenModel; monthLabel: string }) {
  return (
    <div className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md">
      <div className="mb-gt-4 flex items-center gap-gt-8">
        <PixelIcon name="fin-coin" size={22} />
        <span className="text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">Gastado este mes</span>
      </div>
      {/* value + delta INLINE (tight), not pushed to opposite edges */}
      <div className="flex flex-wrap items-center gap-gt-10">
        <span className="font-gt-display text-gt-4xl font-extrabold leading-none text-gt-ink">{model.total}</span>
        {model.delta ? <Badge tone={model.delta.tone}>{model.delta.label}</Badge> : null}
      </div>
      <p className="mt-gt-6 text-gt-xs font-bold uppercase tracking-wide text-gt-ink-3">{monthLabel}</p>
    </div>
  );
}

function InicioSkeleton({ platform }: { platform: Platform }) {
  const maxWidth = platform === "desktop" ? "72rem" : "44rem";
  return (
    <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-4" style={{ maxWidth }} aria-busy="true" aria-label="Cargando inicio">
      <div className="h-8 w-48 animate-pulse rounded-gt-lg bg-gt-bg-3" />
      <div className="h-24 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
      <div className="h-44 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
      <div className="h-40 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
    </div>
  );
}

export function HomeScreen({ model = sampleHome, loading = false, platform = "mobile" }: HomeScreenProps) {
  const [monthIdx, setMonthIdx] = useState(MONTHS.length - 1);
  const [rep, setRep] = useState<"map" | "trend">("map");

  if (loading) return <InicioSkeleton platform={platform} />;

  const isDesktop = platform === "desktop";
  const monthLabel = MONTHS[monthIdx];

  const hero = <InicioHero model={model} monthLabel={monthLabel} />;
  const insight = model.insight ? (
    <StatusCard tone={model.insight.tone} title={model.insight.title}>
      {model.insight.body}
    </StatusCard>
  ) : null;
  // "Este mes" breakdown — a Mapa (treemap) / Tendencia (monthly trend) switcher.
  const breakdown = (
    <section className="flex flex-col gap-gt-10">
      <div className="flex items-center justify-between gap-gt-8">
        <h3 className="text-gt-lg font-extrabold text-gt-ink">Este mes</h3>
        <SegmentedToggle
          segments={[{ id: "map", label: "Mapa" }, { id: "trend", label: "Tendencia" }]}
          value={rep}
          onChange={(v) => setRep(v as "map" | "trend")}
        />
      </div>
      {rep === "map" ? <MonthTreemapCard blocks={model.treemap} title={null} /> : <MonthTrendCard title={null} />}
    </section>
  );
  const gravity = <GravityCentersCard />;
  const recent = <RecentTransactionsCard transactions={model.recent} />;

  const topBar = (
    <div className="flex flex-wrap items-center justify-between gap-gt-8">
      <h2 className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">{model.greeting}</h2>
      <PeriodNav
        label={monthLabel}
        bordered
        onPrev={() => setMonthIdx((i) => Math.max(0, i - 1))}
        onNext={() => setMonthIdx((i) => Math.min(MONTHS.length - 1, i + 1))}
      />
    </div>
  );

  if (isDesktop) {
    return (
      <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-4" style={{ maxWidth: "72rem" }}>
        {topBar}
        {/* hero + insight share a row; treemap + recent each span full width */}
        {insight ? (
          <div className="grid items-start gap-gt-16" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            {hero}
            {insight}
          </div>
        ) : (
          hero
        )}
        {breakdown}
        {gravity}
        {recent}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-4" style={{ maxWidth: "44rem" }}>
      {topBar}
      {hero}
      {insight}
      {breakdown}
      {gravity}
      {recent}
    </div>
  );
}
