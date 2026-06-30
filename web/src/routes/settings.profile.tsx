import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useProfile, profileKeys } from "@/hooks/useProfile";
import { apiClient } from "@/lib/api";
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
 * a "Cuenta" form (editable name / read-only email), the Google-linked-account
 * row, and a full-width save.
 *
 * WIRED: the display name reads from the backend profile (GET /privacy/profile,
 * useProfile) — falling back to the Firebase displayName until that settles — and
 * "Guardar cambios" persists it via POST /privacy/rectification (display_name),
 * then invalidates the profile cache so every consumer refreshes. The save is
 * dirty-gated with saving/saved/error feedback.
 *
 * COMING-SOON (D101): "Cambiar foto" stays a disabled placeholder — there is no
 * photo-storage/upload path (CS-6). The mockup's Teléfono field is intentionally
 * DROPPED (not coming-soon): we choose not to collect phone numbers — data
 * minimization (see COMING-SOON-REGISTRY § Intentionally dropped).
 */
function ProfileSubview() {
  const { user } = useAuth();
  const { t } = useI18n();
  const profile = useProfile();
  const queryClient = useQueryClient();

  const email = profile.data?.email ?? user?.email ?? "—";
  // The persisted display name is the baseline; fall back to the Firebase
  // displayName only until the backend profile loads / when it is unset.
  const savedName =
    (profile.data?.display_name ?? "").trim() || (user?.displayName ?? "").trim();

  // `draft` is null until the user edits; the displayed value derives from the
  // saved name otherwise, so a profile refetch never clobbers an in-progress edit
  // (value is computed during render — no set-state-in-effect seeding).
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const value = draft ?? savedName;
  const dirty = draft !== null && draft.trim() !== savedName;

  const onSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setStatus("idle");
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { display_name: value.trim() },
    });
    setSaving(false);
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    setDraft(null); // fall back to the refetched saved name
    await queryClient.invalidateQueries({ queryKey: profileKeys.all });
  };

  return (
    <SettingsSubviewShell title={t("settings.profile")}>
      {/* Centered avatar header — layout-only wrapper, no border/shadow. */}
      <div className="flex flex-col items-center gap-gt-6">
        <div
          className="grid place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface"
          style={{ width: 88, height: 88 }}
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
        <Input
          aria-label={t("settings.displayName")}
          value={value}
          placeholder="—"
          disabled={profile.isLoading}
          onChange={(e) => {
            setDraft(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
        />
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

      {/* Save — wired to /privacy/rectification (display_name). */}
      <div className="mt-gt-4 flex flex-col gap-gt-6">
        <Button
          variant="primary"
          fullWidth
          disabled={!dirty || saving}
          onClick={() => void onSave()}
        >
          {saving ? t("settings.profile.saving") : t("settings.profile.save")}
        </Button>
        {status === "saved" ? (
          <p className="text-center text-gt-sm font-bold text-gt-success" role="status">
            {t("settings.profile.saved")}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-center text-gt-sm font-bold text-gt-error" role="alert">
            {t("settings.profile.saveError")}
          </p>
        ) : null}
      </div>
    </SettingsSubviewShell>
  );
}
