import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { useLocations } from "@/hooks/useLocations";
import { useProfile, profileKeys } from "@/hooks/useProfile";
import { useDraft } from "@/hooks/useDraft";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";
import { SettingsApplyBar } from "@/components/settings/SettingsApplyBar";
import { Select } from "@/components/ui/Select";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { useUiStore } from "@/stores/uiStore";
import { type ForeignLocationFormat } from "@/lib/locationDisplay";

export const Route = createFileRoute("/settings/scanning")({
  component: ScanningSubview,
});

/**
 * Escaneo subview — the defaults used when scanning a receipt. All four controls
 * are STAGED: Moneda / País / Ciudad (persisted via /privacy/rectification) and the
 * foreign-country indicator (uiStore.foreignLocationFormat) update a local draft
 * and only write on "Aplicar cambios" — batched into a single rectification call —
 * so changing a dropdown no longer fires a request per keystroke. "Descartar"
 * reverts. The default location is the scan-location reconciliation fallback (D103).
 */
function ScanningSubview() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const locations = useLocations();
  const profile = useProfile();
  const foreign = useUiStore((s) => s.foreignLocationFormat);
  const setForeign = useUiStore((s) => s.setForeignLocationFormat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const saved = {
    currency: profile.data?.default_currency ?? "CLP",
    country: profile.data?.default_country ?? "",
    city: profile.data?.default_city ?? "",
    foreign: foreign as string,
  };
  const { value, dirty, draft, set, reset } = useDraft(saved);

  const loading = profile.isLoading || locations.isLoading;

  const countryOptions = (locations.data?.countries ?? []).map((c) => ({ value: c.code, label: c.name }));
  const cityOptions = ((value.country && locations.data?.cities[value.country]) || [])
    .slice()
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map((c) => ({ value: c, label: c }));

  // Picking a country resets the city — the old city belongs to another country.
  const onCountry = (code: string) => set({ country: code, city: "" });

  const discard = () => {
    reset();
    setError(null);
  };

  const apply = async () => {
    setSaving(true);
    setError(null);
    const body: Record<string, string | null> = {};
    if (draft.currency !== undefined && draft.currency !== saved.currency) body.default_currency = draft.currency;
    if (draft.country !== undefined && draft.country !== saved.country) body.default_country = draft.country;
    if (draft.city !== undefined && draft.city !== saved.city) body.default_city = draft.city || null;

    let ok = true;
    if (Object.keys(body).length > 0) {
      const { error: apiError } = await apiClient.POST("/api/v1/privacy/rectification", { body });
      if (apiError) ok = false;
    }
    if (ok) {
      if (draft.foreign !== undefined && draft.foreign !== saved.foreign) {
        setForeign(draft.foreign as ForeignLocationFormat);
      }
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      reset();
    } else {
      setError("settings.applyError");
    }
    setSaving(false);
  };

  return (
    <SettingsSubviewShell title={t("settings.row.scanning")}>
      <SettingsField label={t("settings.scanning.currency")} hint={t("settings.scanning.currencyHint")}>
        <Select
          testId="settings-currency-select"
          disabled={loading || saving}
          value={value.currency}
          onChange={(v) => set({ currency: v })}
          options={[
            { value: "CLP", label: t("settings.scanning.currencyCLP") },
            { value: "USD", label: t("settings.scanning.currencyUSD") },
            { value: "EUR", label: t("settings.scanning.currencyEUR") },
          ]}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.country")} hint={t("settings.scanning.locationHint")}>
        <Select
          testId="settings-country-select"
          disabled={loading || saving}
          value={value.country}
          onChange={onCountry}
          options={countryOptions}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.city")}>
        <Select
          testId="settings-city-select"
          disabled={!value.country || loading || saving}
          value={value.city}
          onChange={(v) => set({ city: v })}
          options={cityOptions}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.foreign")} hint={t("settings.scanning.foreignHint")}>
        <SegmentedToggle
          fill
          flush
          segments={[
            { id: "code", label: t("settings.scanning.foreignCode") },
            { id: "flag", label: t("settings.scanning.foreignFlag") },
          ]}
          value={value.foreign}
          onChange={(id) => set({ foreign: id })}
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
