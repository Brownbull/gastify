import { useState } from "react";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { Select } from "@design-system/atoms/Select";
import { SettingsSubviewShell, SettingsGroupHeading, SettingsField } from "../components/SettingsSubviewShell";

/**
 * Preferencias de la app subview — idioma / fecha / tema (General) + paleta /
 * color de fuente / tipografía / tamaño (Apariencia). 2–3 option pickers use
 * SegmentedToggle; the wider lists use the Select dropdown.
 */
export function PreferencesSubview({ onBack }: { onBack?: () => void }) {
  const [language, setLanguage] = useState("es");
  const [dateFormat, setDateFormat] = useState("latam");
  const [mode, setMode] = useState("light");
  const [palette, setPalette] = useState("normal");
  const [fontColor, setFontColor] = useState("colorful");
  const [typeface, setTypeface] = useState("outfit");
  const [fontSize, setFontSize] = useState("normal");

  return (
    <SettingsSubviewShell title="Preferencias de la app" onBack={onBack}>
      <SettingsGroupHeading>General</SettingsGroupHeading>
      <SettingsField label="Idioma">
        <SegmentedToggle fill flush segments={[{ id: "es", label: "Español" }, { id: "en", label: "English" }]} value={language} onChange={setLanguage} />
      </SettingsField>
      <SettingsField label="Formato de fecha">
        <SegmentedToggle fill flush segments={[{ id: "latam", label: "DD/MM/AAAA" }, { id: "us", label: "MM/DD/AAAA" }]} value={dateFormat} onChange={setDateFormat} />
      </SettingsField>
      <SettingsField label="Modo">
        <SegmentedToggle fill flush tone="primary" segments={[{ id: "light", label: "Claro" }, { id: "dark", label: "Oscuro" }, { id: "auto", label: "Auto" }]} value={mode} onChange={setMode} />
      </SettingsField>

      <SettingsGroupHeading>Apariencia</SettingsGroupHeading>
      <SettingsField label="Paleta de color">
        <Select value={palette} onChange={setPalette} options={[{ value: "normal", label: "Normal" }, { value: "pro", label: "Profesional" }, { value: "mono", label: "Monocromo" }]} />
      </SettingsField>
      <SettingsField label="Color de fuente">
        <SegmentedToggle fill flush segments={[{ id: "colorful", label: "Colorido" }, { id: "simple", label: "Simple" }]} value={fontColor} onChange={setFontColor} />
      </SettingsField>
      <SettingsField label="Tipografía">
        <Select value={typeface} onChange={setTypeface} options={[{ value: "outfit", label: "Outfit" }, { value: "space", label: "Space Grotesk" }]} />
      </SettingsField>
      <SettingsField label="Tamaño de fuente">
        <SegmentedToggle fill flush segments={[{ id: "normal", label: "Normal" }, { id: "small", label: "Pequeño" }]} value={fontSize} onChange={setFontSize} />
      </SettingsField>
    </SettingsSubviewShell>
  );
}
