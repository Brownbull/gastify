import { useState, type ReactNode } from "react";
import { Button } from "@design-system/atoms/Button";
import { Badge } from "@design-system/atoms/Badge";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell } from "../components/SettingsSubviewShell";

/**
 * Datos y respaldo subview — local user + export/import + a disabled cloud-sync
 * row + the destructive "Restablecer todo" (confirmed via Modal). Container-light
 * bare rows; the destructive row sits last with the danger tint.
 */
function ActionRow({ icon, title, subtitle, action, disabled }: { icon: string; title: string; subtitle: string; action?: ReactNode; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-gt-12 px-gt-4 py-gt-10 ${disabled ? "opacity-60" : ""}`}>
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

export function DataSubview({ onBack }: { onBack?: () => void }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Datos y respaldo" onBack={onBack}>
        <ActionRow icon="nav-profile" title="Usuario local" subtitle="Datos guardados en este dispositivo" />
        <ActionRow icon="chart-export" title="Exportar datos" subtitle="Descarga todos tus datos" action={<Button variant="secondary" size="sm">CSV</Button>} />
        <ActionRow icon="action-duplicate" title="Importar datos" subtitle="Restaura desde un archivo CSV" action={<Button variant="secondary" size="sm">Seleccionar</Button>} />
        <ActionRow icon="status-sync" title="Sincronización en la nube" subtitle="Próximamente disponible" disabled action={<Badge tone="neutral">Pronto</Badge>} />

        {/* destructive — set apart, no divider line */}
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="mt-gt-8 flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-negative/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name="action-delete" size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-negative">Restablecer todo</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Elimina todos los datos permanentemente</span>
          </span>
        </button>
      </SettingsSubviewShell>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Borrar todos los datos?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={() => setConfirm(false)}>Borrar todo</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Esto eliminará permanentemente todas tus transacciones, productos y configuraciones de este dispositivo. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
