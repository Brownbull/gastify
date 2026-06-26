import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/preferences")({
  component: PreferencesSubview,
});

const selectClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong disabled:opacity-50";
const DATE_FORMATS = ["dd/MM/yyyy", "MM/dd/yyyy"] as const;

function PreferencesSubview() {
  const { t, locale, setLocale } = useI18n();
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
      body: { date_format: value as (typeof DATE_FORMATS)[number] },
    });
    setSaving(false);
    if (error) setDateFormat(previous);
  };

  return (
    <SettingsSubviewShell title={t("settings.row.preferences")}>
      <SettingsField label={t("locale.label")}>
        <select
          value={locale}
          aria-label={t("locale.label")}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className={selectClass}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </SettingsField>
      <SettingsField label={t("settings.prefs.dateFormat")} hint={t("settings.prefs.dateFormatHint")}>
        <select
          data-testid="settings-date-format"
          value={dateFormat ?? ""}
          disabled={dateFormat === null || saving}
          onChange={(e) => onDateChange(e.target.value)}
          className={selectClass}
        >
          {dateFormat === null && <option value="">…</option>}
          {DATE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </SettingsField>
    </SettingsSubviewShell>
  );
}
