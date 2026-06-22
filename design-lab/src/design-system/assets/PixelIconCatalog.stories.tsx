import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "./PixelIcon";

/**
 * Inspection catalog over the PixelLab icon set (public/pixel-icons/,
 * ported from the frozen docs/mockups/assets/icons suite). Storybook-only —
 * promoted to typed runtime catalogs when screens need them.
 */
const meta = {
  title: "Design System/Assets/Pixel Icons",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const GROUPS: Record<string, string[]> = {
  "Navegación": [
    "nav-home",
    "nav-history",
    "nav-scan",
    "nav-trends",
    "nav-reports",
    "nav-insights",
    "nav-alerts",
    "nav-settings",
    "nav-profile",
  ],
  "Rubros (12)": [
    "rubro-supermercados",
    "rubro-transporte-vehiculo",
    "rubro-restaurantes",
    "rubro-salud-bienestar",
    "rubro-vivienda",
    "rubro-comercio-barrio",
    "rubro-tiendas-generales",
    "rubro-tiendas-especializadas",
    "rubro-servicios-finanzas",
    "rubro-educacion",
    "rubro-entretenimiento-hospedaje",
    "rubro-otros",
  ],
  "Finanzas": [
    "fin-coin",
    "fin-receipt",
    "fin-wallet",
    "fin-credit-card",
    "fin-budget",
    "fin-piggy-bank",
    "fin-income-up",
    "fin-expense-down",
  ],
  "Escaneo": [
    "scan-single",
    "scan-batch",
    "scan-statement",
    "scan-processing",
    "scan-success",
    "scan-error",
    "scan-retry",
    "scan-crop",
  ],
  "Acciones": [
    "action-add",
    "action-delete",
    "action-edit",
    "action-search",
    "action-filter",
    "action-favorite",
    "action-duplicate",
    "action-split",
  ],
  "Estado": ["status-info", "status-warning", "status-offline", "status-sync"],
  "Tiendas (muestra)": [
    "store-supermarket",
    "store-pharmacy",
    "store-gas-station",
    "store-restaurant",
    "store-minimarket",
    "store-bakery",
    "store-hardware",
    "store-transport",
  ],
  "Mascotas + marca": [
    "snowshoe-character-64",
    "snowshoe-face-wave",
    "piggy-bank",
    "piggy-coins-stack",
    "peso-coin",
    "scan-receipt",
  ],
};

export const Catalog: Story = {
  render: () => (
    <div className="flex flex-col gap-6 bg-gt-bg p-6">
      <p className="text-gt-md text-gt-ink-2">
        Convención: glifos con significado = PixelLab; solo acciones utilitarias (cerrar, volver,
        confirmar, cancelar) usan trazos tipo Lucide.
      </p>
      {Object.entries(GROUPS).map(([group, names]) => (
        <section key={group}>
          <h3 className="mb-2 text-gt-lg font-semibold text-gt-ink">{group}</h3>
          <div className="flex flex-wrap gap-3">
            {names.map((name) => (
              <figure
                key={name}
                className="flex w-28 flex-col items-center gap-1.5 rounded-gt-lg border border-gt-line bg-gt-surface p-3 shadow-gt-sm"
              >
                <PixelIcon name={name} size={32} />
                <figcaption className="w-full truncate text-center text-gt-xs text-gt-ink-3">
                  {name}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
