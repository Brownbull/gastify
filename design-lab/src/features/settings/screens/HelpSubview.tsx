import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Badge } from "@design-system/atoms/Badge";
import { Modal } from "@design-system/atoms/Modal";
import { SettingsSubviewShell } from "../components/SettingsSubviewShell";

/**
 * Ayuda e información subview — about/version + a PWA install CTA + legal/support
 * links. Each link opens a placeholder Modal (Términos · Privacidad · Contacto).
 * Net-new vs legacy. Container-light.
 */
interface LegalLink {
  title: string;
  body: string;
}

const LINKS: LegalLink[] = [
  {
    title: "Términos y condiciones",
    body: "Aquí irán los términos y condiciones de uso de Gastify: el acuerdo entre tú y la aplicación. (Contenido de ejemplo — se completará próximamente.)",
  },
  {
    title: "Política de privacidad",
    body: "Aquí irá la política de privacidad de Gastify: qué datos guardamos, cómo los usamos y cómo los protegemos. (Contenido de ejemplo — se completará próximamente.)",
  },
  {
    title: "Contacto y soporte",
    body: "¿Necesitas ayuda? Escríbenos a soporte@gastify.app y te responderemos lo antes posible. (Contenido de ejemplo — se completará próximamente.)",
  },
];

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
    >
      <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{label}</span>
      <span aria-hidden="true" className="grid shrink-0 place-items-center text-gt-ink-3">
        <span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
      </span>
    </button>
  );
}

export function HelpSubview({ onBack }: { onBack?: () => void }) {
  const [active, setActive] = useState<LegalLink | null>(null);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Ayuda e información" onBack={onBack}>
        {/* about */}
        <div className="flex flex-col items-center gap-gt-4 py-gt-12 text-center">
          <span className="font-gt-display text-gt-4xl font-extrabold tracking-tight text-gt-primary">Gastify</span>
          <span className="text-gt-sm font-medium text-gt-ink-3">Tu rastreador de gastos inteligente</span>
          <Badge tone="neutral" className="mt-gt-2">Versión 1.0.0</Badge>
        </div>

        <Button variant="primary" fullWidth>Instalar App</Button>

        {/* links */}
        <section className="flex flex-col gap-gt-4 pt-gt-8">
          <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Enlaces</p>
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <LinkRow key={l.title} label={l.title} onClick={() => setActive(l)} />
            ))}
          </div>
        </section>
      </SettingsSubviewShell>

      <Modal open={active != null} onClose={() => setActive(null)} title={active?.title}>
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">{active?.body}</p>
      </Modal>
    </div>
  );
}
