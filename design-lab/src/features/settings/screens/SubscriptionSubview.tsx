import { useState } from "react";
import { Badge } from "@design-system/atoms/Badge";
import { Button } from "@design-system/atoms/Button";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { SettingsUsageBar } from "../components/SettingsUsageBar";

/**
 * Suscripción subview — the freemium plan surface: current-plan card, the metered
 * scan-credit meter (resets monthly), and a "Mejorar a Pro" upgrade card with its
 * benefit list. Pressing "Mejorar a Pro" opens a SIMULATED upgrade popup
 * (confirm → success, no real charge); confirming flips the whole screen into its
 * Pro state. Presentational mockup — the restore / manage CTAs are inert.
 */

const SCANS_USED = 32;
const SCANS_LIMIT = 50;
const PRO_PRICE = "$3.990 / mes";
const RENEWS_ON = "Se renueva el 1 de julio de 2026";

const PRO_BENEFITS: { icon: string; label: string }[] = [
  { icon: "nav-scan", label: "Escaneos de boletas ilimitados" },
  { icon: "status-sync", label: "Respaldo automático en la nube" },
  { icon: "fin-wallet", label: "Multi-moneda con conversión automática" },
  { icon: "chart-growth", label: "Reportes y tendencias avanzadas" },
];

type UpgradeStep = "confirm" | "success";

function BenefitRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-gt-10">
      <span className="grid h-8 w-8 shrink-0 place-items-center">
        <PixelIcon name={icon} size={26} />
      </span>
      <span className="text-gt-sm font-bold text-gt-ink-2">{label}</span>
    </div>
  );
}

/** Simulated upgrade popup — a confirm step (plan summary + "this is a demo, no
 * charge" notice) that advances to a success step. Step is owned by the parent. */
function UpgradeSimulationModal({
  open,
  step,
  onClose,
  onConfirm,
}: {
  open: boolean;
  step: UpgradeStep;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (step === "success") {
    return (
      <Modal
        open={open}
        onClose={onClose}
        footer={
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={onClose}>Listo</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-gt-8 py-gt-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft shadow-gt-sm">
            <PixelIcon name="credit-super" size={40} />
          </span>
          <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">¡Bienvenido a Plan Pro!</span>
          <span className="text-gt-sm font-medium leading-relaxed text-gt-ink-3">
            Tu suscripción quedó activa. Esto es una simulación: no se realizó ningún cobro.
          </span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mejorar a Plan Pro"
      footer={
        <div className="flex justify-end gap-gt-8">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>Confirmar mejora</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-12">
        <div className="flex items-center gap-gt-10 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10">
          <PixelIcon name="credit-super" size={32} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Plan Pro</span>
            <span className="text-gt-sm font-bold text-gt-ink-2">{PRO_PRICE}</span>
          </div>
        </div>
        <div className="flex items-start gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-bg-2 px-gt-12 py-gt-10">
          <span className="shrink-0">
            <PixelIcon name="status-info" size={22} />
          </span>
          <span className="text-gt-xs font-medium leading-relaxed text-gt-ink-2">
            Esta es una simulación. No se realizará ningún cobro ni se conectará con una pasarela de pago.
          </span>
        </div>
      </div>
    </Modal>
  );
}

export function SubscriptionSubview({ onBack }: { onBack?: () => void }) {
  const [isPro, setIsPro] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [step, setStep] = useState<UpgradeStep>("confirm");

  const remaining = Math.max(0, SCANS_LIMIT - SCANS_USED);

  const openUpgrade = () => {
    setStep("confirm");
    setUpgradeOpen(true);
  };
  const closeUpgrade = () => {
    setUpgradeOpen(false);
    setStep("confirm");
  };
  const confirmUpgrade = () => {
    setIsPro(true);
    setStep("success");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Suscripción" onBack={onBack}>
        {/* Current plan */}
        <SettingsGroupHeading>Plan actual</SettingsGroupHeading>
        <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name={isPro ? "credit-super" : "credit-normal"} size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{isPro ? "Plan Pro" : "Plan Gratis"}</span>
            <span className="truncate text-gt-sm font-medium text-gt-ink-3">
              {isPro ? "Suscripción activa (simulada)" : "Escaneos limitados cada mes"}
            </span>
          </span>
          {isPro ? <Badge tone="primary">Activo</Badge> : <Badge tone="neutral">Gratis</Badge>}
        </div>

        {/* Scan credits */}
        <SettingsGroupHeading>Créditos de escaneo</SettingsGroupHeading>
        {isPro ? (
          <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center">
              <PixelIcon name="nav-scan" size={36} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
              <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Escaneos ilimitados</span>
              <span className="text-gt-sm font-medium text-gt-ink-3">Escanea todas las boletas que quieras</span>
            </span>
            <Badge tone="primary">Pro</Badge>
          </div>
        ) : (
          <div className="flex flex-col gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
            <div className="flex items-end justify-between gap-gt-8">
              <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{remaining} escaneos restantes</span>
              <span className="shrink-0 text-gt-sm font-bold text-gt-ink-3">{SCANS_USED}/{SCANS_LIMIT}</span>
            </div>
            <SettingsUsageBar value={SCANS_USED} max={SCANS_LIMIT} />
            <span className="text-gt-xs font-medium text-gt-ink-3">{RENEWS_ON}</span>
          </div>
        )}

        {/* Upgrade (free) / manage (pro) */}
        {isPro ? (
          <>
            <SettingsGroupHeading>Tu suscripción</SettingsGroupHeading>
            <div className="flex flex-col gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-16 shadow-gt-sm">
              <div className="flex items-center gap-gt-10">
                <PixelIcon name="credit-super" size={40} />
                <div className="flex flex-col">
                  <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Plan Pro activo</span>
                  <span className="text-gt-sm font-bold text-gt-ink-2">{RENEWS_ON}</span>
                </div>
              </div>
              <Button variant="secondary" fullWidth>Gestionar suscripción</Button>
            </div>
          </>
        ) : (
          <>
            <SettingsGroupHeading>Mejora tu plan</SettingsGroupHeading>
            <div className="flex flex-col gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-16 shadow-gt-sm">
              <div className="flex items-center gap-gt-10">
                <PixelIcon name="credit-super" size={40} />
                <div className="flex flex-col">
                  <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Plan Pro</span>
                  <span className="text-gt-sm font-bold text-gt-ink-2">{PRO_PRICE}</span>
                </div>
              </div>
              <div className="flex flex-col gap-gt-8">
                {PRO_BENEFITS.map((b) => (
                  <BenefitRow key={b.label} icon={b.icon} label={b.label} />
                ))}
              </div>
              <Button variant="primary" fullWidth onClick={openUpgrade}>Mejorar a Pro</Button>
            </div>
            <Button variant="ghost" fullWidth>Restaurar compra</Button>
          </>
        )}
      </SettingsSubviewShell>

      <UpgradeSimulationModal open={upgradeOpen} step={step} onClose={closeUpgrade} onConfirm={confirmUpgrade} />
    </div>
  );
}
