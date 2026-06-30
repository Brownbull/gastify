import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";
import { Select } from "@/components/ui/Select";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";

export const Route = createFileRoute("/settings/scanning")({
  component: ScanningSubview,
});

const noop = () => {};

/**
 * Escaneo subview — rebuilt to the design-lab reference: the defaults used when
 * scanning a receipt. Moneda de escaneo is WIRED (default_currency via
 * /privacy/rectification, persisted server-side). Ubicación predeterminada +
 * Indicador de país extranjero have no backing yet, so they render as coming-soon
 * placeholders per D101 (CS-8 / CS-9 in COMING-SOON-REGISTRY.md).
 */
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

  const onCurrencyChange = async (code: string) => {
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
        <Select
          testId="settings-currency-select"
          disabled={current === null || saving}
          value={current ?? "CLP"}
          onChange={(v) => void onCurrencyChange(v)}
          options={[
            { value: "CLP", label: t("settings.scanning.currencyCLP") },
            { value: "USD", label: t("settings.scanning.currencyUSD") },
            { value: "EUR", label: t("settings.scanning.currencyEUR") },
          ]}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.location")} hint={t("settings.scanning.locationHint")} comingSoon>
        <Select
          disabled
          value="santiago"
          onChange={noop}
          options={[
            { value: "santiago", label: "Santiago, Chile" },
            { value: "villarrica", label: "Villarrica, Chile" },
            { value: "vina", label: "Viña del Mar, Chile" },
            { value: "concepcion", label: "Concepción, Chile" },
          ]}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.foreign")} hint={t("settings.scanning.foreignHint")} comingSoon>
        <SegmentedToggle
          fill
          flush
          disabled
          segments={[
            { id: "code", label: t("settings.scanning.foreignCode") },
            { id: "flag", label: t("settings.scanning.foreignFlag") },
          ]}
          value="code"
          onChange={noop}
        />
      </SettingsField>
    </SettingsSubviewShell>
  );
}
