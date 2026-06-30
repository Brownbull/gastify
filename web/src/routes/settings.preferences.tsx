import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { type SupportedLocale } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { SettingsSubviewShell, SettingsField, SettingsGroupHeading } from "@/components/settings/SettingsSubviewShell";
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
 * Preferencias de la app — General (idioma + formato de fecha, both WIRED) +
 * Apariencia. Tipografía (font family Outfit/Space Grotesk) and Tamaño de fuente
 * (Normal/Pequeño) are WIRED + persisted via uiStore → lib/appearance (applied as
 * <html> data-attributes; see global.css). Modo/Paleta/Color de fuente remain
 * coming-soon (cut by D-B) — shown, disabled, badged per D101 (CS-1..3 in
 * docs/mockups/COMING-SOON-REGISTRY.md).
 */
function PreferencesSubview() {
  const { t, locale, setLocale } = useI18n();
  const fontFamily = useUiStore((s) => s.fontFamily);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontFamily = useUiStore((s) => s.setFontFamily);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const [dateFormat, setDateFormat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (!cancelled && data) setDateFormat(data.date_format);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onDateChange = async (value: string) => {
    setSaving(true);
    const previous = dateFormat;
    setDateFormat(value);
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { date_format: value as "dd/MM/yyyy" | "MM/dd/yyyy" },
    });
    setSaving(false);
    if (error) setDateFormat(previous);
  };

  const activeDate = dateFormat ?? DATE_LATAM;

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
          value={locale}
          onChange={(id) => setLocale(id as SupportedLocale)}
        />
      </SettingsField>

      <SettingsField label={t("settings.prefs.dateFormat")}>
        <div className="flex flex-col gap-gt-4">
          <SegmentedToggle
            fill
            flush
            label={t("settings.prefs.dateFormat")}
            disabled={dateFormat === null || saving}
            segments={[
              { id: DATE_LATAM, label: t("settings.prefs.dateLatam") },
              { id: DATE_US, label: t("settings.prefs.dateUs") },
            ]}
            value={activeDate}
            onChange={(id) => void onDateChange(id)}
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
          value={fontFamily}
          onChange={(v) => setFontFamily(v as FontFamilyPref)}
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
          value={fontSize}
          onChange={(id) => setFontSize(id as FontSizePref)}
        />
      </SettingsField>
    </SettingsSubviewShell>
  );
}
