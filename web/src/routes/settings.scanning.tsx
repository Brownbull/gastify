import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/scanning")({
  component: ScanningSubview,
});

const selectClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong disabled:opacity-50";
const CURRENCY_CHOICES = ["CLP", "USD"] as const;

function ScanningSubview() {
  const { t } = useI18n();
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (!cancelled && data) setCurrent(data.default_currency);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (code: string) => {
    setSaving(true);
    const previous = current;
    setCurrent(code);
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { default_currency: code },
    });
    setSaving(false);
    if (error) setCurrent(previous);
  };

  return (
    <SettingsSubviewShell title={t("settings.row.scanning")}>
      <SettingsField label={t("settings.scanning.currency")} hint={t("settings.scanning.currencyHint")}>
        <select
          data-testid="settings-currency-select"
          value={current ?? ""}
          disabled={current === null || saving}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          {current === null && <option value="">…</option>}
          {CURRENCY_CHOICES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </SettingsField>
    </SettingsSubviewShell>
  );
}
