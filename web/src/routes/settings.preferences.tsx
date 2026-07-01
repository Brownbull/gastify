import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey, type SupportedLocale } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { useProfile, profileKeys } from "@/hooks/useProfile";
import { useDraft } from "@/hooks/useDraft";
import { SettingsSubviewShell, SettingsField, SettingsGroupHeading } from "@/components/settings/SettingsSubviewShell";
import { SettingsApplyBar } from "@/components/settings/SettingsApplyBar";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { Select } from "@/components/ui/Select";
import { useUiStore } from "@/stores/uiStore";
import { type FontFamilyPref, type FontSizePref } from "@/lib/appearance";

export const Route = createFileRoute("/settings/preferences")({
  component: PreferencesSubview,
});

const DATE_LATAM = "dd/MM/yyyy";
const DATE_US = "MM/dd/yyyy";

/** Sample (7 Nov 2026) so the user sees how the chosen format renders. */
function sampleFormatted(format: string): string {
  return format === DATE_US ? "11/07/2026" : "07/11/2026";
}

const noop = () => {};

/**
 * Preferencias de la app — General (idioma + formato de fecha) + Apariencia
 * (tipografía + tamaño). All active controls are STAGED into a local draft and
 * only committed on "Aplicar cambios": date format persists via
 * /privacy/rectification, and idioma / tipografía / tamaño write to uiStore →
 * lib/appearance. Nothing changes (or previews) until Apply — "Descartar" reverts.
 * Modo / Paleta / Color de fuente remain coming-soon (cut by D-B; CS-1..3).
 */
function PreferencesSubview() {
  const { t, locale, setLocale } = useI18n();
  const fontFamily = useUiStore((s) => s.fontFamily);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontFamily = useUiStore((s) => s.setFontFamily);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const saved = {
    locale: locale as string,
    dateFormat: profile.data?.date_format ?? DATE_LATAM,
    fontFamily: fontFamily as string,
    fontSize: fontSize as string,
  };
  const { value, dirty, draft, set, reset } = useDraft(saved);

  const discard = () => {
    reset();
    setError(null);
  };

  const apply = async () => {
    setSaving(true);
    setError(null);
    let ok = true;
    if (draft.dateFormat !== undefined && draft.dateFormat !== saved.dateFormat) {
      const { error: apiError } = await apiClient.POST("/api/v1/privacy/rectification", {
        body: { date_format: draft.dateFormat as "dd/MM/yyyy" | "MM/dd/yyyy" },
      });
      if (apiError) ok = false;
    }
    if (ok) {
      if (draft.locale !== undefined && draft.locale !== saved.locale) setLocale(draft.locale as SupportedLocale);
      if (draft.fontFamily !== undefined && draft.fontFamily !== saved.fontFamily) setFontFamily(draft.fontFamily as FontFamilyPref);
      if (draft.fontSize !== undefined && draft.fontSize !== saved.fontSize) setFontSize(draft.fontSize as FontSizePref);
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      reset();
    } else {
      setError("settings.applyError");
    }
    setSaving(false);
  };

  const activeDate = value.dateFormat;

  return (
    <SettingsSubviewShell title={t("settings.row.preferences")}>
      <SettingsGroupHeading>{t("settings.prefs.general")}</SettingsGroupHeading>

      <SettingsField label={t("locale.label")}>
        <SegmentedToggle
          fill
          flush
          label={t("locale.label")}
          segments={[
            { id: "es", label: "Español" },
            { id: "en", label: "English" },
            { id: "pt", label: "Português" },
          ]}
          value={value.locale}
          onChange={(id) => set({ locale: id })}
        />
      </SettingsField>

      <SettingsField label={t("settings.prefs.dateFormat")}>
        <div className="flex flex-col gap-gt-4">
          <SegmentedToggle
            fill
            flush
            label={t("settings.prefs.dateFormat")}
            disabled={profile.isLoading || saving}
            segments={[
              { id: DATE_LATAM, label: t("settings.prefs.dateLatam") },
              { id: DATE_US, label: t("settings.prefs.dateUs") },
            ]}
            value={activeDate}
            onChange={(id) => set({ dateFormat: id })}
          />
          <span className="px-gt-2 text-gt-sm font-medium text-gt-ink-3">
            {t("settings.prefs.dateSample")} →{" "}
            <span className="font-extrabold text-gt-ink">{sampleFormatted(activeDate)}</span>
          </span>
        </div>
      </SettingsField>

      <SettingsField label={t("settings.prefs.mode")} comingSoon>
        <SegmentedToggle
          fill
          flush
          tone="primary"
          disabled
          segments={[
            { id: "light", label: t("settings.prefs.modeLight") },
            { id: "dark", label: t("settings.prefs.modeDark") },
            { id: "auto", label: t("settings.prefs.modeAuto") },
          ]}
          value="light"
          onChange={noop}
        />
      </SettingsField>

      <SettingsGroupHeading>{t("settings.prefs.appearance")}</SettingsGroupHeading>

      <SettingsField label={t("settings.prefs.palette")} comingSoon>
        <Select
          disabled
          value="normal"
          onChange={noop}
          options={[
            { value: "normal", label: t("settings.prefs.paletteNormal") },
            { value: "pro", label: t("settings.prefs.palettePro") },
            { value: "mono", label: t("settings.prefs.paletteMono") },
          ]}
        />
      </SettingsField>

      <SettingsField label={t("settings.prefs.fontColor")} comingSoon>
        <SegmentedToggle
          fill
          flush
          disabled
          segments={[
            { id: "colorful", label: t("settings.prefs.fontColorful") },
            { id: "simple", label: t("settings.prefs.fontSimple") },
          ]}
          value="colorful"
          onChange={noop}
        />
      </SettingsField>

      <SettingsField label={t("settings.prefs.typeface")}>
        <Select
          value={value.fontFamily}
          onChange={(v) => set({ fontFamily: v })}
          options={[
            { value: "outfit", label: "Outfit" },
            { value: "space", label: "Space Grotesk" },
          ]}
        />
      </SettingsField>

      <SettingsField label={t("settings.prefs.fontSize")}>
        <SegmentedToggle
          fill
          flush
          segments={[
            { id: "small", label: t("settings.prefs.sizeSmall") },
            { id: "normal", label: t("settings.prefs.sizeNormal") },
            { id: "large", label: t("settings.prefs.sizeLarge") },
          ]}
          value={value.fontSize}
          onChange={(id) => set({ fontSize: id })}
        />
      </SettingsField>

      <SettingsApplyBar
        dirty={dirty}
        saving={saving}
        error={error ? t(error) : null}
        onApply={() => void apply()}
        onDiscard={discard}
        labels={{ apply: t("settings.apply"), applying: t("settings.applying"), discard: t("settings.discard") }}
      />
    </SettingsSubviewShell>
  );
}
