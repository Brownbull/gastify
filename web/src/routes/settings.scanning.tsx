import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { useLocations } from "@/hooks/useLocations";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";
import { Select } from "@/components/ui/Select";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { useUiStore } from "@/stores/uiStore";
import { type ForeignLocationFormat } from "@/lib/locationDisplay";

export const Route = createFileRoute("/settings/scanning")({
  component: ScanningSubview,
});

/**
 * Escaneo subview — the defaults used when scanning a receipt. Moneda de escaneo,
 * País + Ciudad predeterminados are all WIRED: default_currency / default_country /
 * default_city via /privacy/rectification (persisted), with the country/city
 * options served by /reference/locations. The default location is the scan-location
 * reconciliation fallback when a receipt has no determinable location (D103).
 * Indicador de país extranjero is WIRED: a persisted display pref
 * (uiStore.foreignLocationFormat) the transaction views read to show a FOREIGN
 * country (country != the user's default_country) as its ISO code or flag emoji.
 */
function ScanningSubview() {
  const { t } = useI18n();
  const locations = useLocations();
  const foreignLocationFormat = useUiStore((s) => s.foreignLocationFormat);
  const setForeignLocationFormat = useUiStore((s) => s.setForeignLocationFormat);
  const [currency, setCurrency] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (!cancelled && data) {
        setCurrency(data.default_currency);
        setCountry(data.default_country ?? "");
        setCity(data.default_city ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCurrencyChange = async (code: string) => {
    setSavingCurrency(true);
    const previous = currency;
    setCurrency(code);
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { default_currency: code },
    });
    setSavingCurrency(false);
    if (error) setCurrency(previous);
  };

  // Picking a country resets the city — the old city belongs to another country.
  const onCountryChange = async (code: string) => {
    setSavingLocation(true);
    const prevCountry = country;
    const prevCity = city;
    setCountry(code);
    setCity("");
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { default_country: code, default_city: null },
    });
    setSavingLocation(false);
    if (error) {
      setCountry(prevCountry);
      setCity(prevCity);
    }
  };

  const onCityChange = async (value: string) => {
    setSavingLocation(true);
    const previous = city;
    setCity(value);
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { default_city: value },
    });
    setSavingLocation(false);
    if (error) setCity(previous);
  };

  const countryOptions = (locations.data?.countries ?? []).map((c) => ({
    value: c.code,
    label: c.name,
  }));
  const cityOptions = ((country && locations.data?.cities[country]) || []).map((c) => ({
    value: c,
    label: c,
  }));
  const locationsLoading = locations.isLoading || currency === null;

  return (
    <SettingsSubviewShell title={t("settings.row.scanning")}>
      <SettingsField label={t("settings.scanning.currency")} hint={t("settings.scanning.currencyHint")}>
        <Select
          testId="settings-currency-select"
          disabled={currency === null || savingCurrency}
          value={currency ?? "CLP"}
          onChange={(v) => void onCurrencyChange(v)}
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
          disabled={locationsLoading || savingLocation}
          value={country}
          onChange={(v) => void onCountryChange(v)}
          options={countryOptions}
        />
      </SettingsField>

      <SettingsField label={t("settings.scanning.city")}>
        <Select
          testId="settings-city-select"
          disabled={!country || locationsLoading || savingLocation}
          value={city}
          onChange={(v) => void onCityChange(v)}
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
          value={foreignLocationFormat}
          onChange={(id) => setForeignLocationFormat(id as ForeignLocationFormat)}
        />
      </SettingsField>
    </SettingsSubviewShell>
  );
}
