import { useState } from "react";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { Select } from "@design-system/atoms/Select";
import { SettingsSubviewShell, SettingsField } from "../components/SettingsSubviewShell";

/**
 * Escaneo subview — the defaults used when scanning a receipt: currency, fallback
 * location, and how foreign countries are shown. Currency + location use the
 * Select dropdown; the foreign-format toggle uses SegmentedToggle.
 */
export function ScanSubview({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState("CLP");
  const [location, setLocation] = useState("santiago");
  const [foreignFormat, setForeignFormat] = useState("code");

  return (
    <SettingsSubviewShell title="Escaneo" onBack={onBack}>
      <SettingsField label="Moneda de escaneo" hint="Moneda usada al escanear boletas">
        <Select
          value={currency}
          onChange={setCurrency}
          options={[
            { value: "CLP", label: "CLP — Peso Chileno" },
            { value: "USD", label: "USD — Dólar Estadounidense" },
            { value: "EUR", label: "EUR — Euro" },
          ]}
        />
      </SettingsField>
      <SettingsField label="Ubicación predeterminada" hint="Se usa cuando la boleta no incluye ubicación">
        <Select
          value={location}
          onChange={setLocation}
          options={[
            { value: "santiago", label: "Santiago, Chile" },
            { value: "villarrica", label: "Villarrica, Chile" },
            { value: "vina", label: "Viña del Mar, Chile" },
            { value: "concepcion", label: "Concepción, Chile" },
          ]}
        />
      </SettingsField>
      <SettingsField label="Indicador de país extranjero" hint="Cómo mostrar países extranjeros en las transacciones">
        <SegmentedToggle
          fill
          flush
          segments={[{ id: "code", label: "Código de país" }, { id: "flag", label: "Bandera" }]}
          value={foreignFormat}
          onChange={setForeignFormat}
        />
      </SettingsField>
    </SettingsSubviewShell>
  );
}
