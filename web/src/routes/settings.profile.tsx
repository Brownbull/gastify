import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
  SettingsField,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSubview,
});

/** Google brand "G" glyph — literal vendor logo, so brand hex is intentional. */
function GoogleGlyph() {
  return (
    <svg className="shrink-0" width={20} height={20} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Perfil subview — rebuilt to the design-lab reference: centered avatar header,
 * a "Cuenta" form (name / email read-only), the Google-linked-account row, and a
 * full-width save. Real data is wired where the app backs it (email, display
 * name, linked account); editing — photo and saving changes — is not yet backed,
 * so those affordances render as disabled placeholders per the implement-all-
 * mockups policy (D101). The mockup's Teléfono field is intentionally DROPPED
 * (not coming-soon): we choose not to collect/store phone numbers — data
 * minimization (see COMING-SOON-REGISTRY § Intentionally dropped).
 */
function ProfileSubview() {
  const { user } = useAuth();
  const { t } = useI18n();
  const email = user?.email ?? "—";
  const displayName = user?.displayName ?? "";

  return (
    <SettingsSubviewShell title={t("settings.profile")}>
      {/* Centered avatar header — layout-only wrapper, no border/shadow. */}
      <div className="flex flex-col items-center gap-gt-6">
        <div
          className="grid h-22 w-22 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface"
        >
          <PixelIcon name="cat-snowshoe-v2" size={64} alt={t("settings.profile")} />
        </div>
        <Button variant="ghost" size="sm" disabled>
          {t("settings.profile.changePhoto")}
        </Button>
      </div>

      {/* Cuenta form */}
      <SettingsGroupHeading>{t("settings.section.account")}</SettingsGroupHeading>
      <SettingsField label={t("settings.displayName")}>
        <Input aria-label={t("settings.displayName")} value={displayName} placeholder="—" disabled readOnly />
      </SettingsField>
      <SettingsField label={t("settings.email")} hint={t("settings.profile.emailHint")}>
        <Input aria-label={t("settings.email")} value={email} disabled readOnly />
      </SettingsField>

      {/* Cuenta vinculada — product row */}
      <SettingsGroupHeading>{t("settings.profile.linkedAccount")}</SettingsGroupHeading>
      <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
        <GoogleGlyph />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Google</span>
          <span className="truncate text-gt-sm text-gt-ink-3">{email}</span>
        </div>
        <Badge tone="positive">{t("settings.profile.connected")}</Badge>
      </div>

      {/* Save — editing not yet backed; disabled placeholder (D101). */}
      <Button variant="primary" fullWidth className="mt-gt-4" disabled>
        {t("settings.profile.save")}
      </Button>
    </SettingsSubviewShell>
  );
}
