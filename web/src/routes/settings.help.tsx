import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SettingsSubviewShell } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/help")({
  component: HelpSubview,
});

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "1.0.0";

interface LegalLink {
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

const LINKS: LegalLink[] = [
  { titleKey: "settings.help.terms", bodyKey: "settings.help.termsBody" },
  { titleKey: "settings.help.privacy", bodyKey: "settings.help.privacyBody" },
  { titleKey: "settings.help.contact", bodyKey: "settings.help.contactBody" },
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

/**
 * Ayuda e información — about/version hero + a PWA install CTA + legal/support
 * links. Rebuilt to the design-lab HelpSubview reference (was a version stub).
 *
 * COMING-SOON (D101): "Instalar App" is a disabled placeholder — web has no PWA
 * install path (no manifest / service worker / beforeinstallprompt) (CS-10). The 3
 * legal/support links open a Modal with PLACEHOLDER copy — there is no backend
 * serving legal/support text yet (CS-11/12/13); the link interaction works, the
 * body content is sample text marked as such.
 */
function HelpSubview() {
  const { t } = useI18n();
  const [active, setActive] = useState<LegalLink | null>(null);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.help")}>
        {/* about hero */}
        <div className="flex flex-col items-center gap-gt-4 py-gt-12 text-center">
          <span className="font-gt-display text-gt-4xl font-extrabold tracking-tight text-gt-primary">Gastify</span>
          <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.help.tagline")}</span>
          <Badge tone="neutral" className="mt-gt-2">
            {t("settings.help.version")} {APP_VERSION}
          </Badge>
        </div>

        {/* install CTA — coming-soon (no PWA install path in web) */}
        <Button variant="primary" fullWidth disabled>
          {t("settings.help.install")}
        </Button>
        <p className="text-center text-gt-sm text-gt-ink-3">{t("settings.comingSoon")}</p>

        {/* links */}
        <section className="flex flex-col gap-gt-4 pt-gt-8">
          <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">
            {t("settings.help.links")}
          </p>
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <LinkRow key={l.titleKey} label={t(l.titleKey)} onClick={() => setActive(l)} />
            ))}
          </div>
        </section>
      </SettingsSubviewShell>

      <Modal
        open={active != null}
        onClose={() => setActive(null)}
        title={active ? t(active.titleKey) : undefined}
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          {active ? t(active.bodyKey) : ""}
        </p>
      </Modal>
    </div>
  );
}
