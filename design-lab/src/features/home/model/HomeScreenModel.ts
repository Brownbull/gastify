import type { BadgeTone } from "@design-system/atoms/Badge";

/**
 * Mock state for the Inicio screen — feature-owned catalog, no data layer.
 * Amounts follow Chilean-peso formatting ($12.500, dot thousands, no decimals).
 */

export interface HomeTransaction {
  merchant: string;
  thumbnail: string;
  category: string;
  date: string;
  location: string;
  items: number;
  amount: string;
  badge?: { tone: BadgeTone; label: string };
  firstItem?: { name: string; qty: number; price: string };
}

export interface TreemapBlock {
  label: string;
  amount: string;
  /** gt-* chart color class — token-backed. */
  colorClass: string;
  /** grid span classes for the squarified-treemap approximation. */
  spanClass: string;
}

/** the dashboard insight (a StatusCard). */
export interface HomeInsight {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
}

export interface HomeScreenModel {
  greeting: string;
  monthLabel: string;
  total: string;
  delta?: { tone: BadgeTone; label: string };
  insight?: HomeInsight;
  treemap: TreemapBlock[];
  recent: HomeTransaction[];
}

export const sampleHome: HomeScreenModel = {
  greeting: "Hola, Benjamín 👋",
  monthLabel: "Este mes · junio 2026",
  total: "$384.520",
  delta: { tone: "positive", label: "−12% vs mayo" },
  insight: {
    tone: "success",
    title: "Vas bien este mes",
    body: "Gastaste 12% menos que en mayo. Supermercado sigue siendo tu mayor categoría.",
  },
  treemap: [
    { label: "Supermercado", amount: "$182.300", colorClass: "bg-gt-chart-1", spanClass: "col-span-2 row-span-2" },
    { label: "Transporte", amount: "$74.900", colorClass: "bg-gt-chart-2", spanClass: "col-span-2" },
    { label: "Restaurantes", amount: "$52.100", colorClass: "bg-gt-chart-3", spanClass: "" },
    { label: "Salud", amount: "$38.700", colorClass: "bg-gt-chart-5", spanClass: "" },
    { label: "Hogar", amount: "$24.500", colorClass: "bg-gt-chart-6", spanClass: "" },
    { label: "Otros", amount: "$12.020", colorClass: "bg-gt-chart-4", spanClass: "" },
  ],
  recent: [
    {
      merchant: "Supermercado Líder",
      thumbnail: "item-pantry",
      category: "supermercados",
      date: "hoy 18:42",
      location: "Villarrica",
      items: 12,
      amount: "$45.990",
      firstItem: { name: "Arroz integral 1kg", qty: 2, price: "$3.490" },
    },
    {
      merchant: "Copec Apoquindo",
      thumbnail: "item-car-accessories",
      category: "transporte-vehiculo",
      date: "ayer",
      location: "Las Condes",
      items: 1,
      amount: "$25.000",
      firstItem: { name: "Bencina 95 octanos", qty: 1, price: "$25.000" },
    },
    {
      merchant: "Farmacia Cruz Verde",
      thumbnail: "item-medications",
      category: "salud-bienestar",
      date: "ayer",
      location: "Villarrica",
      items: 3,
      amount: "$12.350",
      badge: { tone: "warning", label: "duplicado" },
      firstItem: { name: "Ibuprofeno 400mg", qty: 1, price: "$4.990" },
    },
  ],
};

export const emptyHome: HomeScreenModel = {
  greeting: "Hola, Benjamín 👋",
  monthLabel: "Este mes · junio 2026",
  total: "$0",
  treemap: [],
  recent: [],
};
