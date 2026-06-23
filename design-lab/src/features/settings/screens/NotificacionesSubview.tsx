import { useState, type ReactNode } from "react";
import { Switch } from "@design-system/atoms/Switch";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell } from "../components/SettingsSubviewShell";

/**
 * Notificaciones subview — push + spending-reminder toggles (the Switch atom's
 * first real home) + a "probar notificación" action. Container-light bare rows,
 * matching the settings hub. Reminders disable until push is on.
 */
function ToggleRow({ icon, title, subtitle, checked, onChange, disabled }: { icon: string; title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-gt-12 px-gt-4 py-gt-10 ${disabled ? "opacity-50" : ""}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</span>
        <span className="text-gt-sm font-medium text-gt-ink-3">{subtitle}</span>
      </span>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

function ActionRow({ icon, title, subtitle, action }: { icon: string; title: string; subtitle: string; action: ReactNode }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</span>
        <span className="text-gt-sm font-medium text-gt-ink-3">{subtitle}</span>
      </span>
      {action}
    </div>
  );
}

export function NotificacionesSubview({ onBack }: { onBack?: () => void }) {
  const [push, setPush] = useState(true);
  const [reminders, setReminders] = useState(false);

  return (
    <SettingsSubviewShell title="Notificaciones" onBack={onBack}>
      <ToggleRow
        icon="nav-alerts"
        title="Notificaciones Push"
        subtitle="Alertas sobre gastos, presupuestos y recordatorios"
        checked={push}
        onChange={setPush}
      />
      <ToggleRow
        icon="nav-historial"
        title="Recordatorios de Gasto"
        subtitle="Resumen semanal de tus gastos"
        checked={reminders}
        onChange={setReminders}
        disabled={!push}
      />
      {push ? (
        <ActionRow
          icon="status-info"
          title="Probar Notificación"
          subtitle="Envía una notificación de prueba"
          action={<Button variant="secondary" size="sm">Enviar</Button>}
        />
      ) : null}
    </SettingsSubviewShell>
  );
}
