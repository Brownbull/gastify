import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/help")({
  component: HelpSubview,
});

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "1.0.0";

function HelpSubview() {
  const { t } = useI18n();
  return (
    <SettingsSubviewShell title={t("settings.row.help")}>
      <p className="text-gt-md font-medium text-gt-ink-2">{t("settings.help.about")}</p>
      <SettingsField label={t("settings.help.version")}>
        <span className="font-gt-display text-gt-md font-bold text-gt-ink">{APP_VERSION}</span>
      </SettingsField>
    </SettingsSubviewShell>
  );
}
