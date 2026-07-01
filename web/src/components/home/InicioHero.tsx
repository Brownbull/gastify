import { PixelIcon } from "@/components/shell/PixelIcon";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { useI18n } from "@/hooks/useI18n";

export interface HeroDelta {
  tone: BadgeTone;
  label: string;
}

/**
 * InicioHero — the home "Gastado este mes" hero: fin-coin eyebrow, the big
 * period total, an inline month-over-month delta Badge, and the month caption.
 * Ports design-lab HomeScreen's InicioHero, wired to real insights data.
 */
export function InicioHero({
  total,
  delta,
  monthLabel,
}: {
  total: string;
  delta: HeroDelta | null;
  monthLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div
      data-testid="home-hero"
      className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md"
    >
      <div className="mb-gt-4 flex items-center gap-gt-8">
        <PixelIcon name="fin-coin" size={22} />
        <span className="text-gt-sm font-extrabold uppercase tracking-[0.06em] text-gt-ink-3">
          {t("home.spentThisMonth")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-gt-10">
        <span
          data-testid="total-spend"
          className="font-gt-display text-gt-4xl font-extrabold leading-none tabular-nums text-gt-ink"
        >
          {total}
        </span>
        {delta ? <Badge tone={delta.tone}>{delta.label}</Badge> : null}
      </div>
      <p className="mt-gt-6 text-gt-xs font-bold uppercase tracking-wide text-gt-ink-3">{monthLabel}</p>
    </div>
  );
}
