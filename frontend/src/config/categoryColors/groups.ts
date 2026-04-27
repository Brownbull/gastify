/**
 * Category group mappings and helper functions.
 * Split from categoryColors.ts (Story 14.21)
 * Updated for V4 taxonomy (Story 17-2)
 */

import type {
  StoreCategory,
  ItemCategory,
  StoreCategoryGroup,
  ItemCategoryGroup,
  ItemCategoryKey,
  GroupDisplayInfo,
} from './types';

// ============================================================================
// STORE CATEGORY GROUPS — L1 Rubros (12 groups, 44 giros)
// ============================================================================

export const STORE_CATEGORY_GROUPS: Record<StoreCategory, StoreCategoryGroup> = {
  // Supermercados
  Supermarket: 'supermercados',
  Wholesale: 'supermercados',
  // Restaurantes
  Restaurant: 'restaurantes',
  // Comercio de Barrio
  Almacen: 'comercio-barrio',
  Minimarket: 'comercio-barrio',
  OpenMarket: 'comercio-barrio',
  Kiosk: 'comercio-barrio',
  LiquorStore: 'comercio-barrio',
  Bakery: 'comercio-barrio',
  Butcher: 'comercio-barrio',
  // Vivienda
  UtilityCompany: 'vivienda',
  PropertyAdmin: 'vivienda',
  // Salud y Bienestar
  Pharmacy: 'salud-bienestar',
  Medical: 'salud-bienestar',
  Veterinary: 'salud-bienestar',
  HealthBeauty: 'salud-bienestar',
  // Tiendas Generales
  Bazaar: 'tiendas-generales',
  ClothingStore: 'tiendas-generales',
  ElectronicsStore: 'tiendas-generales',
  HomeGoods: 'tiendas-generales',
  FurnitureStore: 'tiendas-generales',
  Hardware: 'tiendas-generales',
  GardenCenter: 'tiendas-generales',
  // Tiendas Especializadas
  PetShop: 'tiendas-especializadas',
  BookStore: 'tiendas-especializadas',
  OfficeSupplies: 'tiendas-especializadas',
  SportsStore: 'tiendas-especializadas',
  ToyStore: 'tiendas-especializadas',
  AccessoriesOptical: 'tiendas-especializadas',
  OnlineStore: 'tiendas-especializadas',
  // Transporte y Vehiculo
  AutoShop: 'transporte-vehiculo',
  GasStation: 'transporte-vehiculo',
  Transport: 'transporte-vehiculo',
  // Servicios y Finanzas
  GeneralServices: 'servicios-finanzas',
  BankingFinance: 'servicios-finanzas',
  TravelAgency: 'servicios-finanzas',
  SubscriptionService: 'servicios-finanzas',
  Government: 'servicios-finanzas',
  // Educacion
  Education: 'educacion',
  // Entretenimiento y Hospedaje
  Lodging: 'entretenimiento-hospedaje',
  Entertainment: 'entretenimiento-hospedaje',
  Casino: 'entretenimiento-hospedaje',
  // Otros
  CharityDonation: 'otros',
  Other: 'otros',
};

// ============================================================================
// ITEM CATEGORY GROUPS — L3 Familias (9 groups, 42 categorias)
// ============================================================================

/**
 * Identity mapping for V4 — ItemCategory keys are already PascalCase.
 * Kept for backward compatibility with color/group lookup APIs.
 */
export const ITEM_CATEGORY_TO_KEY: Record<ItemCategory, ItemCategoryKey> = {
  'Produce': 'Produce',
  'MeatSeafood': 'MeatSeafood',
  'BreadPastry': 'BreadPastry',
  'DairyEggs': 'DairyEggs',
  'Pantry': 'Pantry',
  'FrozenFoods': 'FrozenFoods',
  'Snacks': 'Snacks',
  'Beverages': 'Beverages',
  'PreparedFood': 'PreparedFood',
  'BeautyCosmetics': 'BeautyCosmetics',
  'PersonalCare': 'PersonalCare',
  'Medications': 'Medications',
  'Supplements': 'Supplements',
  'BabyProducts': 'BabyProducts',
  'CleaningSupplies': 'CleaningSupplies',
  'HomeEssentials': 'HomeEssentials',
  'PetSupplies': 'PetSupplies',
  'PetFood': 'PetFood',
  'Furnishings': 'Furnishings',
  'Apparel': 'Apparel',
  'Technology': 'Technology',
  'Tools': 'Tools',
  'Garden': 'Garden',
  'CarAccessories': 'CarAccessories',
  'SportsOutdoors': 'SportsOutdoors',
  'ToysGames': 'ToysGames',
  'BooksMedia': 'BooksMedia',
  'OfficeStationery': 'OfficeStationery',
  'Crafts': 'Crafts',
  'ServiceCharge': 'ServiceCharge',
  'TaxFees': 'TaxFees',
  'Subscription': 'Subscription',
  'Insurance': 'Insurance',
  'LoanPayment': 'LoanPayment',
  'TicketsEvents': 'TicketsEvents',
  'HouseholdBills': 'HouseholdBills',
  'CondoFees': 'CondoFees',
  'EducationFees': 'EducationFees',
  'Alcohol': 'Alcohol',
  'Tobacco': 'Tobacco',
  'GamesOfChance': 'GamesOfChance',
  'OtherItem': 'OtherItem',
};

export const ITEM_CATEGORY_GROUPS: Record<ItemCategoryKey, ItemCategoryGroup> = {
  // Alimentos Frescos
  Produce: 'food-fresh',
  MeatSeafood: 'food-fresh',
  BreadPastry: 'food-fresh',
  DairyEggs: 'food-fresh',
  // Alimentos Envasados
  Pantry: 'food-packaged',
  FrozenFoods: 'food-packaged',
  Snacks: 'food-packaged',
  Beverages: 'food-packaged',
  // Comida Preparada
  PreparedFood: 'food-prepared',
  // Salud y Cuidado Personal
  BeautyCosmetics: 'salud-cuidado',
  PersonalCare: 'salud-cuidado',
  Medications: 'salud-cuidado',
  Supplements: 'salud-cuidado',
  BabyProducts: 'salud-cuidado',
  // Hogar
  CleaningSupplies: 'hogar',
  HomeEssentials: 'hogar',
  PetSupplies: 'hogar',
  PetFood: 'hogar',
  Furnishings: 'hogar',
  // Productos Generales
  Apparel: 'productos-generales',
  Technology: 'productos-generales',
  Tools: 'productos-generales',
  Garden: 'productos-generales',
  CarAccessories: 'productos-generales',
  SportsOutdoors: 'productos-generales',
  ToysGames: 'productos-generales',
  BooksMedia: 'productos-generales',
  OfficeStationery: 'productos-generales',
  Crafts: 'productos-generales',
  // Servicios y Cargos
  ServiceCharge: 'servicios-cargos',
  TaxFees: 'servicios-cargos',
  Subscription: 'servicios-cargos',
  Insurance: 'servicios-cargos',
  LoanPayment: 'servicios-cargos',
  TicketsEvents: 'servicios-cargos',
  HouseholdBills: 'servicios-cargos',
  CondoFees: 'servicios-cargos',
  EducationFees: 'servicios-cargos',
  // Vicios
  Alcohol: 'vicios',
  Tobacco: 'vicios',
  GamesOfChance: 'vicios',
  // Otros
  OtherItem: 'otros-item',
};

// ============================================================================
// CATEGORY GROUP HELPERS
// ============================================================================

/**
 * All store category group keys in display order.
 */
export const ALL_STORE_CATEGORY_GROUPS: StoreCategoryGroup[] = [
  'supermercados',
  'restaurantes',
  'comercio-barrio',
  'vivienda',
  'salud-bienestar',
  'tiendas-generales',
  'tiendas-especializadas',
  'transporte-vehiculo',
  'educacion',
  'servicios-finanzas',
  'entretenimiento-hospedaje',
  'otros',
];

/**
 * Expands a store category group to all its member categories.
 *
 * @param group - The group key (e.g., 'supermercados')
 * @returns Array of StoreCategory values in that group
 *
 * @example
 * expandStoreCategoryGroup('supermercados')
 * // Returns: ['Supermarket', 'Wholesale']
 */
export function expandStoreCategoryGroup(group: StoreCategoryGroup): StoreCategory[] {
  const categories: StoreCategory[] = [];
  for (const [category, categoryGroup] of Object.entries(STORE_CATEGORY_GROUPS)) {
    if (categoryGroup === group) {
      categories.push(category as StoreCategory);
    }
  }
  return categories;
}

/**
 * Detects if a set of selected categories exactly matches a known store category group.
 *
 * @param selectedCategories - Array of selected StoreCategory values
 * @returns The matching group key, or null if no exact match
 *
 * @example
 * detectStoreCategoryGroup(['Supermarket', 'Wholesale'])
 * // Returns: 'supermercados'
 *
 * detectStoreCategoryGroup(['Supermarket', 'Restaurant'])
 * // Returns: null (partial match)
 */
export function detectStoreCategoryGroup(selectedCategories: string[]): StoreCategoryGroup | null {
  if (selectedCategories.length === 0) return null;

  // Check each group for exact match
  for (const group of ALL_STORE_CATEGORY_GROUPS) {
    const groupCategories = expandStoreCategoryGroup(group);
    if (groupCategories.length !== selectedCategories.length) continue;

    // Sort both arrays and compare
    const sortedSelected = [...selectedCategories].sort();
    const sortedGroup = [...groupCategories].sort();

    let isMatch = true;
    for (let i = 0; i < sortedSelected.length; i++) {
      if (sortedSelected[i] !== sortedGroup[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) return group;
  }

  return null;
}

/**
 * Gets the primary (first) category in a store category group.
 * Used to determine the representative emoji for the group.
 *
 * @param group - The group key
 * @returns The first StoreCategory in that group
 */
export function getStoreCategoryGroupPrimaryCategory(group: StoreCategoryGroup): StoreCategory {
  const categories = expandStoreCategoryGroup(group);
  return categories[0] || 'Other';
}

// ============================================================================
// ITEM CATEGORY GROUP HELPERS
// ============================================================================

/**
 * All item category group keys in display order.
 */
export const ALL_ITEM_CATEGORY_GROUPS: ItemCategoryGroup[] = [
  'food-fresh',
  'food-packaged',
  'food-prepared',
  'salud-cuidado',
  'hogar',
  'productos-generales',
  'servicios-cargos',
  'vicios',
  'otros-item',
];

/**
 * Expands an item category group to all its member categories.
 *
 * @param group - The group key (e.g., 'food-fresh')
 * @returns Array of ItemCategory values in that group
 */
export function expandItemCategoryGroup(group: ItemCategoryGroup): ItemCategory[] {
  const categories: ItemCategory[] = [];
  for (const [category, categoryKey] of Object.entries(ITEM_CATEGORY_TO_KEY)) {
    const categoryGroup = ITEM_CATEGORY_GROUPS[categoryKey as keyof typeof ITEM_CATEGORY_GROUPS];
    if (categoryGroup === group) {
      categories.push(category as ItemCategory);
    }
  }
  return categories;
}

/**
 * Detects if a set of selected categories exactly matches a known item category group.
 *
 * @param selectedCategories - Array of selected ItemCategory values
 * @returns The matching group key, or null if no exact match
 */
export function detectItemCategoryGroup(selectedCategories: string[]): ItemCategoryGroup | null {
  if (selectedCategories.length === 0) return null;

  // Check each group for exact match
  for (const group of ALL_ITEM_CATEGORY_GROUPS) {
    const groupCategories = expandItemCategoryGroup(group);
    if (groupCategories.length !== selectedCategories.length) continue;

    // Sort both arrays and compare
    const sortedSelected = [...selectedCategories].sort();
    const sortedGroup = [...groupCategories].sort();

    let isMatch = true;
    for (let i = 0; i < sortedSelected.length; i++) {
      if (sortedSelected[i] !== sortedGroup[i]) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) return group;
  }

  return null;
}

// ============================================================================
// GROUP DISPLAY INFO — V4 (Story 17-2)
// ============================================================================

/**
 * Store category group display information.
 * Maps group keys to display names and emojis for report rendering.
 */
export const STORE_GROUP_INFO: Record<StoreCategoryGroup, GroupDisplayInfo> = {
  'supermercados': {
    key: 'supermercados',
    name: 'Supermercados',
    emoji: '\uD83D\uDED2', // 🛒
    cssClass: 'supermercados',
  },
  'restaurantes': {
    key: 'restaurantes',
    name: 'Restaurantes',
    emoji: '\uD83C\uDF7D\uFE0F', // 🍽️
    cssClass: 'restaurantes',
  },
  'comercio-barrio': {
    key: 'comercio-barrio',
    name: 'Comercio de Barrio',
    emoji: '\uD83C\uDFEA', // 🏪
    cssClass: 'comercio-barrio',
  },
  'vivienda': {
    key: 'vivienda',
    name: 'Vivienda',
    emoji: '\uD83C\uDFE0', // 🏠
    cssClass: 'vivienda',
  },
  'salud-bienestar': {
    key: 'salud-bienestar',
    name: 'Salud y Bienestar',
    emoji: '\uD83D\uDC8A', // 💊
    cssClass: 'salud-bienestar',
  },
  'tiendas-generales': {
    key: 'tiendas-generales',
    name: 'Tiendas Generales',
    emoji: '\uD83C\uDFEC', // 🏬
    cssClass: 'tiendas-generales',
  },
  'tiendas-especializadas': {
    key: 'tiendas-especializadas',
    name: 'Tiendas Especializadas',
    emoji: '\uD83C\uDF81', // 🎁
    cssClass: 'tiendas-especializadas',
  },
  'transporte-vehiculo': {
    key: 'transporte-vehiculo',
    name: 'Transporte y Veh\u00edculo',
    emoji: '\uD83D\uDE97', // 🚗
    cssClass: 'transporte-vehiculo',
  },
  'educacion': {
    key: 'educacion',
    name: 'Educaci\u00f3n',
    emoji: '\uD83C\uDF93', // 🎓
    cssClass: 'educacion',
  },
  'servicios-finanzas': {
    key: 'servicios-finanzas',
    name: 'Servicios y Finanzas',
    emoji: '\uD83C\uDFE2', // 🏢
    cssClass: 'servicios-finanzas',
  },
  'entretenimiento-hospedaje': {
    key: 'entretenimiento-hospedaje',
    name: 'Entretenimiento y Hospedaje',
    emoji: '\uD83C\uDFAD', // 🎭
    cssClass: 'entretenimiento-hospedaje',
  },
  'otros': {
    key: 'otros',
    name: 'Otros',
    emoji: '\uD83D\uDCE6', // 📦
    cssClass: 'otros',
  },
};

/**
 * Item category group display information.
 * Maps group keys to display names and emojis for report rendering (monthly+).
 */
export const ITEM_GROUP_INFO: Record<ItemCategoryGroup, GroupDisplayInfo> = {
  'food-fresh': {
    key: 'food-fresh',
    name: 'Alimentos Frescos',
    emoji: '\uD83E\uDD6C', // 🥬
    cssClass: 'food-fresh',
  },
  'food-packaged': {
    key: 'food-packaged',
    name: 'Alimentos Envasados',
    emoji: '\uD83E\uDD6B', // 🥫
    cssClass: 'food-packaged',
  },
  'food-prepared': {
    key: 'food-prepared',
    name: 'Comida Preparada',
    emoji: '\uD83C\uDF71', // 🍱
    cssClass: 'food-prepared',
  },
  'salud-cuidado': {
    key: 'salud-cuidado',
    name: 'Salud y Cuidado Personal',
    emoji: '\uD83D\uDC8A', // 💊
    cssClass: 'salud-cuidado',
  },
  'hogar': {
    key: 'hogar',
    name: 'Hogar',
    emoji: '\uD83C\uDFE0', // 🏠
    cssClass: 'hogar',
  },
  'productos-generales': {
    key: 'productos-generales',
    name: 'Productos Generales',
    emoji: '\uD83D\uDECD\uFE0F', // 🛍️
    cssClass: 'productos-generales',
  },
  'servicios-cargos': {
    key: 'servicios-cargos',
    name: 'Servicios y Cargos',
    emoji: '\uD83D\uDCCB', // 📋
    cssClass: 'servicios-cargos',
  },
  'vicios': {
    key: 'vicios',
    name: 'Vicios',
    emoji: '\uD83D\uDEAC', // 🚬
    cssClass: 'vicios',
  },
  'otros-item': {
    key: 'otros-item',
    name: 'Otros',
    emoji: '\uD83D\uDCE6', // 📦
    cssClass: 'otros-item',
  },
};
