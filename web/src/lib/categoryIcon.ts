/**
 * Category → pixel-icon resolution. Category KEYS are PascalCase English
 * (e.g. "BreadPastry", "Supermarkets"); the pixel-icon files are lowercase-kebab,
 * and the store (rubro) icons are SPANISH and only exist at the L1-industry level.
 * These resolvers convert the key and guard against the known icon slugs so an
 * unmapped key falls back to a real icon instead of rendering a broken <img>.
 */

/** Item-category icon slugs present under public/pixel-icons (item-*.png). */
const ITEM_SLUGS = new Set([
  "alcohol", "apparel", "baby", "beauty-cosmetics", "beverages", "books-media",
  "bread-pastry", "car-accessories", "cleaning", "condo-fees", "crafts", "dairy-eggs",
  "education-fees", "frozen", "furnishings", "games-of-chance", "garden",
  "home-essentials", "household-bills", "insurance", "loan", "meat-seafood",
  "medications", "office-stationery", "other", "pantry", "personal-care", "pet-food",
  "pet-supplies", "prepared-food", "produce", "service-charge", "snacks",
  "sports-outdoors", "subscription", "supplements", "tax-fees", "technology",
  "tickets", "tobacco", "tools", "toys-games",
]);

/** Store-category (rubro) icon slugs present under public/pixel-icons (rubro-*.png). */
const RUBRO_SLUGS = new Set([
  "comercio-barrio", "educacion", "entretenimiento-hospedaje", "otros", "restaurantes",
  "salud-bienestar", "servicios-finanzas", "supermercados", "tiendas-especializadas",
  "tiendas-generales", "transporte-vehiculo", "vivienda",
]);

/** Best-effort English-industry → Spanish-rubro slug map (the rubro icons are Spanish). */
const RUBRO_BY_EN: Record<string, string> = {
  supermarkets: "supermercados",
  restaurants: "restaurantes",
  transport: "transporte-vehiculo",
  transportation: "transporte-vehiculo",
  transportvehicle: "transporte-vehiculo",
  vehicle: "transporte-vehiculo",
  health: "salud-bienestar",
  healthwellness: "salud-bienestar",
  wellness: "salud-bienestar",
  housing: "vivienda",
  home: "vivienda",
  education: "educacion",
  entertainment: "entretenimiento-hospedaje",
  entertainmentlodging: "entretenimiento-hospedaje",
  lodging: "entretenimiento-hospedaje",
  finance: "servicios-finanzas",
  financialservices: "servicios-finanzas",
  services: "servicios-finanzas",
  generalstores: "tiendas-generales",
  specializedstores: "tiendas-especializadas",
  specialtystores: "tiendas-especializadas",
  neighborhoodcommerce: "comercio-barrio",
  neighborhood: "comercio-barrio",
  other: "otros",
};

/** "BreadPastry" → "bread-pastry"; "DairyEggs" → "dairy-eggs". */
export function kebabCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

/** Resolve an item category key to an existing item-*.png slug (fallback item-other). */
export function itemCategoryIcon(key: string | undefined): string {
  if (!key) return "item-other";
  const slug = kebabCase(key);
  return `item-${ITEM_SLUGS.has(slug) ? slug : "other"}`;
}

/** Resolve a store category key to an existing rubro-*.png slug (fallback rubro-otros). */
export function storeCategoryIcon(key: string | undefined): string {
  if (!key) return "rubro-otros";
  const slug = kebabCase(key);
  if (RUBRO_SLUGS.has(slug)) return `rubro-${slug}`; // already a Spanish slug
  const mapped = RUBRO_BY_EN[slug.replace(/-/g, "")]; // English industry → Spanish
  return `rubro-${mapped ?? "otros"}`;
}
