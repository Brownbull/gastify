import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSubview,
});

function ProfileSubview() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <SettingsSubviewShell title={t("settings.row.profile")}>
      <SettingsField label={t("settings.email")}>
        <span className="font-gt-display text-gt-md font-bold text-gt-ink">{user?.email ?? "—"}</span>
      </SettingsField>
      <SettingsField label={t("settings.displayName")}>
        <span className="font-gt-display text-gt-md font-bold text-gt-ink">{user?.displayName ?? "—"}</span>
      </SettingsField>
    </SettingsSubviewShell>
  );
}
