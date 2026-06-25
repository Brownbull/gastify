import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";

/**
 * Datos y privacidad subview — grounded on the backend /consent + /privacy
 * (Ley 21.719 / GDPR). A data-access summary (Art 15), per-purpose consent
 * toggles (grant/revoke), the activity/audit log, data export (Art 20, JSON) and
 * account deletion (Art 17, hard-delete).
 */
interface Purpose {
  id: string;
  icon: string;
  title: string;
  body: string;
}

const PURPOSES: Purpose[] = [
  { id: "ai", icon: "scan-success", title: "Procesamiento con IA", body: "Extraer datos de boletas y cartolas cuando el lector determinista no alcanza." },
  { id: "analytics", icon: "chart-donut", title: "Mejoras y comparativas", body: "Usar tus datos anonimizados en cohortes. Puedes revocarlo cuando quieras." },
  { id: "push", icon: "nav-alerts", title: "Notificaciones push", body: "Avisarte cuando un escaneo o una conciliación termina." },
];

const AUDIT = [
  { action: "Otorgaste", purpose: "Procesamiento con IA", when: "12 mar 2026" },
  { action: "Otorgaste", purpose: "Notificaciones push", when: "12 mar 2026" },
  { action: "Revocaste", purpose: "Mejoras y comparativas", when: "3 abr 2026" },
];

const SUMMARY: Array<{ label: string; value: string }> = [
  { label: "Transacciones", value: "248" },
  { label: "Ítems", value: "1.204" },
  { label: "Consentimientos", value: "2" },
  { label: "Desde", value: "mar 2026" },
];

export function PrivacySubview({ onBack }: { onBack?: () => void }) {
  const [consent, setConsent] = useState<Record<string, boolean>>({ ai: true, analytics: false, push: true });
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Datos y privacidad" onBack={onBack}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          Controla cómo se procesan tus datos. Cumplimos la Ley 21.719 (Chile) y el RGPD.
        </p>

        {/* data-access summary (Art 15) */}
        <SettingsGroupHeading>Tus datos</SettingsGroupHeading>
        <div className="grid grid-cols-2 gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm">
          {SUMMARY.map((s) => (
            <div key={s.label} className="flex flex-col gap-gt-1 rounded-gt-lg bg-gt-bg-3 px-gt-10 py-gt-8">
              <span className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{s.value}</span>
              <span className="text-gt-xs font-bold uppercase tracking-wide text-gt-ink-3">{s.label}</span>
            </div>
          ))}
        </div>

        {/* per-purpose consent toggles */}
        <SettingsGroupHeading>Consentimiento</SettingsGroupHeading>
        <div className="flex flex-col">
          {PURPOSES.map((p) => (
            <div key={p.id} className="flex items-center gap-gt-10 px-gt-4 py-gt-10">
              <span className="grid h-11 w-11 shrink-0 place-items-center">
                <PixelIcon name={p.icon} size={34} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
                <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{p.title}</span>
                <span className="text-gt-xs font-medium text-gt-ink-3">{p.body}</span>
              </span>
              <Switch checked={!!consent[p.id]} onChange={(v) => setConsent((c) => ({ ...c, [p.id]: v }))} label={p.title} />
            </div>
          ))}
        </div>

        {/* rights — audit, export, delete */}
        <SettingsGroupHeading>Tus derechos</SettingsGroupHeading>
        <button type="button" onClick={() => setAuditOpen(true)} className="flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-10 text-left transition hover:bg-gt-bg-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="status-info" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Registro de actividad</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Historial de tus consentimientos</span>
          </span>
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
        </button>
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="chart-export" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Exportar mis datos</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Descarga todo en JSON (portabilidad)</span>
          </span>
          <Button variant="secondary" size="sm">JSON</Button>
        </div>

        {/* destructive — account deletion */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-gt-8 flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-negative/10"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="action-delete" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-negative">Eliminar mi cuenta</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Borra todos tus datos de forma permanente</span>
          </span>
        </button>
      </SettingsSubviewShell>

      {/* audit log */}
      <Modal open={auditOpen} onClose={() => setAuditOpen(false)} title="Registro de actividad">
        <ul className="flex flex-col divide-y-2 divide-gt-line">
          {AUDIT.map((a, i) => (
            <li key={i} className="flex items-center gap-gt-8 py-gt-8">
              <PixelIcon name={a.action === "Otorgaste" ? "scan-success" : "status-alert"} size={20} className="shrink-0" />
              <span className="min-w-0 flex-1 text-gt-sm font-bold text-gt-ink-2">
                <span className="font-extrabold text-gt-ink">{a.action}</span> «{a.purpose}»
              </span>
              <span className="shrink-0 text-gt-xs font-bold text-gt-ink-3">{a.when}</span>
            </li>
          ))}
        </ul>
      </Modal>

      {/* account deletion confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar tu cuenta?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(false)}>Eliminar cuenta</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          Se borrarán de forma permanente todas tus transacciones, ítems, imágenes, tarjetas y mapeos, y se revocarán tus consentimientos. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
