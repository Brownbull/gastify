import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { useQuota } from "@/hooks/useQuota";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SettingsUsageBar } from "@/components/ui/SettingsUsageBar";
import { PixelIcon } from "@/components/shell/PixelIcon";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/subscription")({
  component: SubscriptionSubview,
});

const BENEFITS: { icon: string; key: MessageKey }[] = [
  { icon: "nav-scan", key: "settings.subscription.benefitScans" },
  { icon: "status-sync", key: "settings.subscription.benefitBackup" },
  { icon: "fin-wallet", key: "settings.subscription.benefitCurrency" },
  { icon: "chart-growth", key: "settings.subscription.benefitReports" },
];

/**
 * Suscripción — the freemium plan surface, rebuilt to the design-lab
 * SubscriptionSubview reference. WIRED: current plan + the scan-credit meter read
 * from the real tier/quota snapshot (useQuota → /billing/quota; free=20, premium=60
 * scans/month). The plan card, "X/Y" line and usage bar are all live.
 *
 * COMING-SOON (D101, CS-15): "Mejorar a Pro" — there is no payment gateway wired
 * (billing.set_tier is internal/admin only), so the upgrade CTA opens an honest
 * "coming soon" Modal instead of the reference's simulated charge-less flip.
 */
function SubscriptionSubview() {
  const { t } = useI18n();
  const quota = useQuota();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const tier = quota.data?.tier ?? "free";
  const isPro = tier === "premium";
  const scan = quota.data?.features.scan;
  const used = scan?.used ?? 0;
  const limit = scan?.limit ?? 0;
  const remaining = Math.max(0, limit - used);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.subscription")}>
        {/* current plan */}
        <SettingsGroupHeading>{t("settings.subscription.currentPlan")}</SettingsGroupHeading>
        <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name={isPro ? "credit-super" : "credit-normal"} size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">
              {isPro ? t("settings.subscription.planPro") : t("settings.subscription.planFree")}
            </span>
            <span className="truncate text-gt-sm font-medium text-gt-ink-3">
              {isPro ? t("settings.subscription.planProDesc") : t("settings.subscription.planFreeDesc")}
            </span>
          </span>
          {isPro ? (
            <Badge tone="primary">{t("settings.subscription.active")}</Badge>
          ) : (
            <Badge tone="neutral">{t("settings.subscription.free")}</Badge>
          )}
        </div>

        {/* scan credits */}
        <SettingsGroupHeading>{t("settings.subscription.scanCredits")}</SettingsGroupHeading>
        <div className="flex flex-col gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
          <div className="flex items-end justify-between gap-gt-8">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">
              {remaining} {t("settings.subscription.scansLeft")}
            </span>
            <span className="shrink-0 text-gt-sm font-bold text-gt-ink-3">{used}/{limit}</span>
          </div>
          <SettingsUsageBar value={used} max={limit} />
          <span className="text-gt-xs font-medium text-gt-ink-3">{t("settings.subscription.renews")}</span>
        </div>

        {/* upgrade (free only) */}
        {!isPro ? (
          <>
            <SettingsGroupHeading>{t("settings.subscription.upgrade")}</SettingsGroupHeading>
            <div className="flex flex-col gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-16 shadow-gt-sm">
              <div className="flex items-center gap-gt-10">
                <PixelIcon name="credit-super" size={40} />
                <div className="flex flex-col">
                  <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t("settings.subscription.planPro")}</span>
                  <span className="text-gt-sm font-bold text-gt-ink-2">{t("settings.subscription.proPrice")}</span>
                </div>
              </div>
              <div className="flex flex-col gap-gt-8">
                {BENEFITS.map((b) => (
                  <div key={b.key} className="flex items-center gap-gt-10">
                    <span className="grid h-8 w-8 shrink-0 place-items-center">
                      <PixelIcon name={b.icon} size={26} />
                    </span>
                    <span className="text-gt-sm font-bold text-gt-ink-2">{t(b.key)}</span>
                  </div>
                ))}
              </div>
              <Button variant="primary" fullWidth onClick={() => setUpgradeOpen(true)}>
                {t("settings.subscription.upgradeCta")}
              </Button>
            </div>
          </>
        ) : null}
      </SettingsSubviewShell>

      {/* upgrade — coming-soon (no payment gateway wired) */}
      <Modal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title={t("settings.subscription.upgradeCta")}
        footer={
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setUpgradeOpen(false)}>
              {t("settings.subscription.gotIt")}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-gt-8 py-gt-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft shadow-gt-sm">
            <PixelIcon name="credit-super" size={40} />
          </span>
          <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t("settings.subscription.soonTitle")}</span>
          <span className="text-gt-sm font-medium leading-relaxed text-gt-ink-3">{t("settings.subscription.soonBody")}</span>
        </div>
      </Modal>
    </div>
  );
}
