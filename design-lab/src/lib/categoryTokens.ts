/**
 * Category tokens — config-driven color + pixel icon per taxonomy category
 * (DM-4). Two parallel hierarchies:
 *   STORE: L1 Rubro (12)   → L2 Giro (44)        — "where you buy"
 *   ITEM:  L3 Familia (9)   → L4 Categoría (42)   — "what you buy"
 * Each category id maps to { label, icon, color, tint } and is the SINGLE
 * SOURCE for that category's color + icon across the app. `CategoryChip` reads
 * from here by id.
 *
 * Provenance: ported from the legacy `docs/mockups/assets/tokens/
 * {groupColors,storeColors,itemColors,categories}.ts` (BoletApp 3-theme) →
 * collapsed to the single Playful Geometric theme (normal.light values) and
 * RE-TINTED so the 12 L1 rubros are mutually distinct on cream/ink.
 *
 * Color rule (DM-4): L1 rubros + L3 familias carry distinct BASE colors;
 * L2 giros inherit their parent rubro's color, L4 categorías inherit their
 * parent familia's color — distinguished within a group by their pixel icon.
 *
 * Colors here are DATA, not gt-* design tokens — applied via inline style in
 * CategoryChip (documented exception, like treemap chart colors). New
 * categories are added HERE; components never hardcode a category color.
 */

export type CategoryLevel = "L1" | "L2" | "L3" | "L4";

export interface CategoryToken {
  id: string;
  level: CategoryLevel;
  /** Spanish display label. */
  label: string;
  /** pixel-icon name under /pixel-icons/. */
  icon: string;
  /** saturated hue — solid fill, icon accent, treemap block. */
  color: string;
  /** soft background tint — the chip fill on cream. */
  tint: string;
  /** parent category id (set on L2 giros + L4 categorías). */
  parent?: string;
}

/** L1 — 12 Rubros (storeGroups). Distinct hues; ported + retinted. */
export const RUBROS: CategoryToken[] = [
  { id: "supermercados", level: "L1", label: "Supermercados", icon: "rubro-supermercados", color: "#15803d", tint: "#dcfce7" },
  { id: "restaurantes", level: "L1", label: "Restaurantes", icon: "rubro-restaurantes", color: "#c2410c", tint: "#ffedd5" },
  { id: "comercio-barrio", level: "L1", label: "Comercio de Barrio", icon: "rubro-comercio-barrio", color: "#b45309", tint: "#fef3c7" },
  { id: "vivienda", level: "L1", label: "Vivienda", icon: "rubro-vivienda", color: "#1d4ed8", tint: "#dbeafe" },
  { id: "salud-bienestar", level: "L1", label: "Salud y Bienestar", icon: "rubro-salud-bienestar", color: "#be185d", tint: "#fce7f3" },
  { id: "tiendas-generales", level: "L1", label: "Tiendas Generales", icon: "rubro-tiendas-generales", color: "#0f766e", tint: "#ccfbf1" },
  { id: "tiendas-especializadas", level: "L1", label: "Tiendas Especializadas", icon: "rubro-tiendas-especializadas", color: "#7c3aed", tint: "#ede9fe" },
  { id: "transporte-vehiculo", level: "L1", label: "Transporte y Vehículo", icon: "rubro-transporte-vehiculo", color: "#475569", tint: "#f1f5f9" },
  { id: "educacion", level: "L1", label: "Educación", icon: "rubro-educacion", color: "#4338ca", tint: "#e0e7ff" },
  { id: "servicios-finanzas", level: "L1", label: "Servicios y Finanzas", icon: "rubro-servicios-finanzas", color: "#0369a1", tint: "#e0f2fe" },
  { id: "entretenimiento-hospedaje", level: "L1", label: "Entretenimiento y Hospedaje", icon: "rubro-entretenimiento-hospedaje", color: "#a21caf", tint: "#fae8ff" },
  { id: "otros", level: "L1", label: "Otros", icon: "rubro-otros", color: "#57534e", tint: "#f5f5f4" },
];

/** L3 — 9 Familias (itemGroups). Distinct base colors (ported). */
export const FAMILIAS: CategoryToken[] = [
  { id: "food-fresh", level: "L3", label: "Alimentos Frescos", icon: "familia-food-fresh", color: "#15803d", tint: "#dcfce7" },
  { id: "food-packaged", level: "L3", label: "Alimentos Envasados", icon: "familia-food-packaged", color: "#92400e", tint: "#fef3c7" },
  { id: "food-prepared", level: "L3", label: "Comida Preparada", icon: "familia-food-prepared", color: "#c2410c", tint: "#ffedd5" },
  { id: "salud-cuidado", level: "L3", label: "Salud y Cuidado Personal", icon: "familia-salud-cuidado", color: "#a21caf", tint: "#fae8ff" },
  { id: "hogar", level: "L3", label: "Hogar", icon: "familia-hogar", color: "#0f766e", tint: "#ccfbf1" },
  { id: "productos-generales", level: "L3", label: "Productos Generales", icon: "familia-productos-generales", color: "#1e40af", tint: "#dbeafe" },
  { id: "servicios-cargos", level: "L3", label: "Servicios y Cargos", icon: "familia-servicios-cargos", color: "#475569", tint: "#f1f5f9" },
  { id: "vicios", level: "L3", label: "Vicios", icon: "familia-vicios", color: "#6d28d9", tint: "#ede9fe" },
  { id: "otros-item", level: "L3", label: "Otros", icon: "familia-otros-item", color: "#57534e", tint: "#f5f5f4" },
];

/** L2 giro raw rows — [id, label, parentRubro, icon]; color/tint inherit parent. */
type Row = [id: string, label: string, parent: string, icon: string];

const GIRO_ROWS: Row[] = [
  ["Supermarket", "Supermercado", "supermercados", "store-supermarket"],
  ["Wholesale", "Mayorista", "supermercados", "store-wholesale"],
  ["Restaurant", "Restaurante", "restaurantes", "store-restaurant"],
  ["Almacen", "Almacén", "comercio-barrio", "store-almacen"],
  ["Minimarket", "Minimarket", "comercio-barrio", "store-minimarket"],
  ["OpenMarket", "Feria", "comercio-barrio", "store-open-market"],
  ["Kiosk", "Kiosko", "comercio-barrio", "store-kiosk"],
  ["LiquorStore", "Botillería", "comercio-barrio", "store-liquor"],
  ["Bakery", "Panadería", "comercio-barrio", "store-bakery"],
  ["Butcher", "Carnicería", "comercio-barrio", "store-butcher"],
  ["UtilityCompany", "Servicios Básicos", "vivienda", "store-utility"],
  ["PropertyAdmin", "Administración", "vivienda", "store-property"],
  ["Pharmacy", "Farmacia", "salud-bienestar", "store-pharmacy"],
  ["Medical", "Médico", "salud-bienestar", "store-medical"],
  ["Veterinary", "Veterinario", "salud-bienestar", "store-veterinary"],
  ["HealthBeauty", "Salud y Belleza", "salud-bienestar", "store-beauty"],
  ["Bazaar", "Bazar", "tiendas-generales", "store-bazaar"],
  ["ClothingStore", "Tienda de Ropa", "tiendas-generales", "store-clothing"],
  ["ElectronicsStore", "Tienda de Electrónica", "tiendas-generales", "store-electronics"],
  ["HomeGoods", "Hogar", "tiendas-generales", "store-home-goods"],
  ["FurnitureStore", "Mueblería", "tiendas-generales", "store-furniture"],
  ["Hardware", "Ferretería", "tiendas-generales", "store-hardware"],
  ["GardenCenter", "Jardinería", "tiendas-generales", "store-garden"],
  ["PetShop", "Tienda de Mascotas", "tiendas-especializadas", "store-pet-shop"],
  ["BookStore", "Librería", "tiendas-especializadas", "store-bookstore"],
  ["OfficeSupplies", "Artículos de Oficina", "tiendas-especializadas", "store-office"],
  ["SportsStore", "Tienda de Deportes", "tiendas-especializadas", "store-sports"],
  ["ToyStore", "Juguetería", "tiendas-especializadas", "store-toys"],
  ["AccessoriesOptical", "Accesorios y Óptica", "tiendas-especializadas", "store-optical"],
  ["OnlineStore", "Tienda Online", "tiendas-especializadas", "store-online"],
  ["AutoShop", "Taller Automotriz", "transporte-vehiculo", "store-auto-shop"],
  ["GasStation", "Bencinera", "transporte-vehiculo", "store-gas-station"],
  ["Transport", "Transporte", "transporte-vehiculo", "store-transport"],
  ["Education", "Educación", "educacion", "store-education"],
  ["GeneralServices", "Servicios Generales", "servicios-finanzas", "store-services"],
  ["BankingFinance", "Banca y Finanzas", "servicios-finanzas", "store-bank"],
  ["TravelAgency", "Agencia de Viajes", "servicios-finanzas", "store-travel"],
  ["SubscriptionService", "Servicio de Suscripción", "servicios-finanzas", "store-subscription"],
  ["Government", "Gobierno", "servicios-finanzas", "store-government"],
  ["Lodging", "Hospedaje", "entretenimiento-hospedaje", "store-lodging"],
  ["Entertainment", "Entretenimiento", "entretenimiento-hospedaje", "store-entertainment"],
  ["Casino", "Casino", "entretenimiento-hospedaje", "store-casino"],
  ["CharityDonation", "Caridad y Donación", "otros", "store-charity"],
  ["Other", "Otro", "otros", "store-other"],
];

/** L4 categoría raw rows — [id, label, parentFamilia, icon]; color/tint inherit parent. */
const CATEGORIA_ROWS: Row[] = [
  ["Produce", "Frutas y Verduras", "food-fresh", "item-produce"],
  ["MeatSeafood", "Carnes y Mariscos", "food-fresh", "item-meat-seafood"],
  ["BreadPastry", "Pan y Repostería", "food-fresh", "item-bread-pastry"],
  ["DairyEggs", "Lácteos y Huevos", "food-fresh", "item-dairy-eggs"],
  ["Pantry", "Despensa", "food-packaged", "item-pantry"],
  ["FrozenFoods", "Congelados", "food-packaged", "item-frozen"],
  ["Snacks", "Snacks y Golosinas", "food-packaged", "item-snacks"],
  ["Beverages", "Bebidas", "food-packaged", "item-beverages"],
  ["PreparedFood", "Comida Preparada", "food-prepared", "item-prepared-food"],
  ["BeautyCosmetics", "Belleza y Cosmética", "salud-cuidado", "item-beauty-cosmetics"],
  ["PersonalCare", "Cuidado Personal", "salud-cuidado", "item-personal-care"],
  ["Medications", "Medicamentos", "salud-cuidado", "item-medications"],
  ["Supplements", "Suplementos", "salud-cuidado", "item-supplements"],
  ["BabyProducts", "Productos para Bebé", "salud-cuidado", "item-baby"],
  ["CleaningSupplies", "Productos de Limpieza", "hogar", "item-cleaning"],
  ["HomeEssentials", "Artículos del Hogar", "hogar", "item-home-essentials"],
  ["PetSupplies", "Productos para Mascotas", "hogar", "item-pet-supplies"],
  ["PetFood", "Comida para Mascotas", "hogar", "item-pet-food"],
  ["Furnishings", "Mobiliario y Hogar", "hogar", "item-furnishings"],
  ["Apparel", "Vestuario", "productos-generales", "item-apparel"],
  ["Technology", "Tecnología", "productos-generales", "item-technology"],
  ["Tools", "Herramientas", "productos-generales", "item-tools"],
  ["Garden", "Jardín", "productos-generales", "item-garden"],
  ["CarAccessories", "Accesorios de Auto", "productos-generales", "item-car-accessories"],
  ["SportsOutdoors", "Deportes y Exterior", "productos-generales", "item-sports-outdoors"],
  ["ToysGames", "Juguetes y Juegos", "productos-generales", "item-toys-games"],
  ["BooksMedia", "Libros y Medios", "productos-generales", "item-books-media"],
  ["OfficeStationery", "Oficina y Papelería", "productos-generales", "item-office-stationery"],
  ["Crafts", "Manualidades", "productos-generales", "item-crafts"],
  ["ServiceCharge", "Cargo por Servicio", "servicios-cargos", "item-service-charge"],
  ["TaxFees", "Impuestos y Cargos", "servicios-cargos", "item-tax-fees"],
  ["Subscription", "Suscripción", "servicios-cargos", "item-subscription"],
  ["Insurance", "Seguros", "servicios-cargos", "item-insurance"],
  ["LoanPayment", "Pago de Préstamo", "servicios-cargos", "item-loan"],
  ["TicketsEvents", "Entradas y Eventos", "servicios-cargos", "item-tickets"],
  ["HouseholdBills", "Cuentas del Hogar", "servicios-cargos", "item-household-bills"],
  ["CondoFees", "Gastos Comunes", "servicios-cargos", "item-condo-fees"],
  ["EducationFees", "Gastos de Educación", "servicios-cargos", "item-education-fees"],
  ["Alcohol", "Alcohol", "vicios", "item-alcohol"],
  ["Tobacco", "Tabaco", "vicios", "item-tobacco"],
  ["GamesOfChance", "Juegos de Azar", "vicios", "item-games-of-chance"],
  ["OtherItem", "Otro Producto", "otros-item", "item-other"],
];

function expand(rows: Row[], level: CategoryLevel, parents: CategoryToken[]): CategoryToken[] {
  const byId = Object.fromEntries(parents.map((p) => [p.id, p]));
  return rows.map(([id, label, parent, icon]) => {
    const p = byId[parent];
    return { id, level, label, icon, color: p.color, tint: p.tint, parent };
  });
}

/** L2 — 44 Giros (storeCategories), tinted from parent rubro. */
export const GIROS: CategoryToken[] = expand(GIRO_ROWS, "L2", RUBROS);
/** L4 — 42 Categorías (itemCategories), tinted from parent familia. */
export const CATEGORIAS: CategoryToken[] = expand(CATEGORIA_ROWS, "L4", FAMILIAS);

/** All category tokens, flat, by id (L1–L4). */
export const CATEGORY_TOKENS: Record<string, CategoryToken> = Object.fromEntries(
  [...RUBROS, ...GIROS, ...FAMILIAS, ...CATEGORIAS].map((t) => [t.id, t]),
);

/** Direct children of a category (rubro→giros, familia→categorías). */
export function childrenOf(parentId: string): CategoryToken[] {
  return Object.values(CATEGORY_TOKENS).filter((t) => t.parent === parentId);
}

const FALLBACK: CategoryToken = {
  id: "otros",
  level: "L1",
  label: "Otros",
  icon: "rubro-otros",
  color: "#57534e",
  tint: "#f5f5f4",
};

/** Look up a category token by id; falls back to "Otros" for unknown ids. */
export function getCategoryToken(id: string): CategoryToken {
  return CATEGORY_TOKENS[id] ?? FALLBACK;
}
