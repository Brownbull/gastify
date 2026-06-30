import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { SettingsUsageBar } from "@/components/ui/SettingsUsageBar";
import { PixelIcon } from "@/components/shell/PixelIcon";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/limits")({
  component: LimitsSubview,
});

const SAMPLES: { key: MessageKey; icon: string; spent: number; limit: number }[] = [
  { key: "settings.limits.catFood", icon: "rubro-supermercados", spent: 182000, limit: 250000 },
  { key: "settings.limits.catTransport", icon: "rubro-transporte-vehiculo", spent: 96000, limit: 120000 },
  { key: "settings.limits.catHome", icon: "rubro-vivienda", spent: 268000, limit: 300000 },
];

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

/**
 * Límites de gasto — per-category monthly budgets. Fully COMING-SOON (D101, CS-19):
 * there is no spending-limit / budget endpoint in the backend, so this renders the
 * design-lab grammar (master toggle + per-category budget cards with usage bars)
 * as a clearly-labelled PREVIEW with illustrative example values — nothing here is
 * wired or interactive. Builds the mockup UI without faking real spend data.
 */
function LimitsSubview() {
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.limits")}>
        {/* coming-soon hero */}
        <div className="flex flex-col items-center gap-gt-6 py-gt-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft shadow-gt-sm">
            <PixelIcon name="fin-budget" size={40} />
          </span>
          <Badge tone="neutral">{t("settings.comingSoon")}</Badge>
          <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t("settings.limits.soonTitle")}</span>
          <span className="text-gt-sm font-medium leading-relaxed text-gt-ink-3">{t("settings.limits.intro")}</span>
        </div>

        {/* preview disclaimer */}
        <div className="flex items-center gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-bg-2 px-gt-12 py-gt-8">
          <PixelIcon name="status-info" size={20} className="shrink-0" />
          <span className="text-gt-xs font-medium text-gt-ink-2">{t("settings.limits.previewNote")}</span>
        </div>

        {/* master toggle (disabled preview) */}
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10 opacity-60">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name="fin-budget" size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("settings.limits.masterTitle")}</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.limits.masterSubtitle")}</span>
          </span>
          <Switch checked={false} disabled onChange={() => undefined} label={t("settings.limits.masterTitle")} />
        </div>

        {/* sample per-category budget cards (illustrative) */}
        <SettingsGroupHeading>{t("settings.limits.section")}</SettingsGroupHeading>
        <div className="flex flex-col gap-gt-8 opacity-60">
          {SAMPLES.map((s) => (
            <div key={s.key} className="flex flex-col gap-gt-6 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10 shadow-gt-sm">
              <div className="flex items-center gap-gt-10">
                <span className="grid h-10 w-10 shrink-0 place-items-center">
                  <PixelIcon name={s.icon} size={30} />
                </span>
                <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{t(s.key)}</span>
                <span className="shrink-0 text-gt-sm font-bold text-gt-ink-3">{clp(s.spent)} / {clp(s.limit)}</span>
              </div>
              <SettingsUsageBar value={s.spent} max={s.limit} />
            </div>
          ))}
        </div>
      </SettingsSubviewShell>
    </div>
  );
}
