/**
 * Category Translation Utilities
 *
 * Story 9.12: UI Content Translation
 * Updated for V4 taxonomy (Story 17-2)
 * Provides translation mappings for categories, item groups, and subcategories.
 * Data is stored in English (canonical form) and translated on display only.
 *
 * @see docs/architecture/category-taxonomy-v2.md
 */

import type { Language } from './translations';

// ============================================================================
// Store Category Translations — V4 (44 giros)
// ============================================================================

/**
 * Translations for store categories (transaction.category).
 * Keys match StoreCategory type values.
 */
const STORE_CATEGORY_TRANSLATIONS: Record<string, Record<Language, string>> = {
    // Supermercados
    'Supermarket': { en: 'Supermarket', es: 'Supermercado' },
    'Wholesale': { en: 'Wholesale', es: 'Mayorista' },
    // Restaurantes
    'Restaurant': { en: 'Restaurant', es: 'Restaurante' },
    // Comercio de Barrio
    'Almacen': { en: 'Corner Store', es: 'Almac\u00e9n' },
    'Minimarket': { en: 'Minimarket', es: 'Minimarket' },
    'OpenMarket': { en: 'Open-Air Market', es: 'Feria' },
    'Kiosk': { en: 'Kiosk', es: 'Kiosko' },
    'LiquorStore': { en: 'Liquor Store', es: 'Botiller\u00eda' },
    'Bakery': { en: 'Bakery', es: 'Panader\u00eda' },
    'Butcher': { en: 'Butcher', es: 'Carnicer\u00eda' },
    // Vivienda
    'UtilityCompany': { en: 'Utility Company', es: 'Servicios B\u00e1sicos' },
    'PropertyAdmin': { en: 'Property Management', es: 'Administraci\u00f3n' },
    // Salud y Bienestar
    'Pharmacy': { en: 'Pharmacy', es: 'Farmacia' },
    'Medical': { en: 'Medical', es: 'M\u00e9dico' },
    'Veterinary': { en: 'Veterinary', es: 'Veterinario' },
    'HealthBeauty': { en: 'Health & Beauty', es: 'Salud y Belleza' },
    // Tiendas Generales
    'Bazaar': { en: 'Bazaar', es: 'Bazar' },
    'ClothingStore': { en: 'Clothing Store', es: 'Tienda de Ropa' },
    'ElectronicsStore': { en: 'Electronics Store', es: 'Tienda de Electr\u00f3nica' },
    'HomeGoods': { en: 'Home Goods', es: 'Art\u00edculos del Hogar' },
    'FurnitureStore': { en: 'Furniture Store', es: 'Muebler\u00eda' },
    'Hardware': { en: 'Hardware Store', es: 'Ferreter\u00eda' },
    'GardenCenter': { en: 'Garden Center', es: 'Jardiner\u00eda' },
    // Tiendas Especializadas
    'PetShop': { en: 'Pet Shop', es: 'Tienda de Mascotas' },
    'BookStore': { en: 'Book Store', es: 'Librer\u00eda' },
    'OfficeSupplies': { en: 'Office Supplies', es: 'Art\u00edculos de Oficina' },
    'SportsStore': { en: 'Sports Store', es: 'Tienda de Deportes' },
    'ToyStore': { en: 'Toy Store', es: 'Jugueter\u00eda' },
    'AccessoriesOptical': { en: 'Accessories & Optical', es: 'Accesorios y \u00d3ptica' },
    'OnlineStore': { en: 'Online Store', es: 'Tienda Online' },
    // Transporte y Vehiculo
    'AutoShop': { en: 'Auto Shop', es: 'Taller Automotriz' },
    'GasStation': { en: 'Gas Station', es: 'Bencinera' },
    'Transport': { en: 'Transport', es: 'Transporte' },
    // Servicios y Finanzas
    'GeneralServices': { en: 'General Services', es: 'Servicios Generales' },
    'BankingFinance': { en: 'Banking & Finance', es: 'Banca y Finanzas' },
    'TravelAgency': { en: 'Travel Agency', es: 'Agencia de Viajes' },
    'SubscriptionService': { en: 'Subscription Service', es: 'Servicio de Suscripci\u00f3n' },
    'Government': { en: 'Government', es: 'Gobierno' },
    // Educacion
    'Education': { en: 'Education', es: 'Educaci\u00f3n' },
    // Entretenimiento y Hospedaje
    'Lodging': { en: 'Lodging', es: 'Hospedaje' },
    'Entertainment': { en: 'Entertainment', es: 'Entretenimiento' },
    'Casino': { en: 'Casino / Gambling', es: 'Casino / Apuestas' },
    // Otros
    'CharityDonation': { en: 'Charity & Donation', es: 'Caridad y Donaci\u00f3n' },
    'Other': { en: 'Other', es: 'Otro' },
    // Legacy values (V3 keys — for backward display compatibility)
    'Parking': { en: 'Parking', es: 'Estacionamiento' },
    'Gas Station': { en: 'Gas Station', es: 'Bencinera' },
    'StreetVendor': { en: 'Street Vendor', es: 'Vendedor Ambulante' },
    'Jewelry': { en: 'Jewelry', es: 'Joyer\u00eda' },
    'Optical': { en: 'Optical', es: '\u00d3ptica' },
    'MusicStore': { en: 'Music Store', es: 'Tienda de M\u00fasica' },
    'Clothing': { en: 'Clothing', es: 'Ropa' },
    'Electronics': { en: 'Electronics', es: 'Electr\u00f3nica' },
    'Furniture': { en: 'Furniture', es: 'Muebles' },
    'Automotive': { en: 'Automotive', es: 'Automotriz' },
    'HotelLodging': { en: 'Hotel & Lodging', es: 'Hotel y Alojamiento' },
    'Gambling': { en: 'Gambling', es: 'Apuestas' },
    'Services': { en: 'Services', es: 'Servicios' },
    'BooksMedia': { en: 'Books & Media', es: 'Libros y Medios' },
    'SportsOutdoors': { en: 'Sports & Outdoors', es: 'Deportes y Exterior' },
    'ToysGames': { en: 'Toys & Games', es: 'Juguetes y Juegos' },
    'Subscription': { en: 'Subscription', es: 'Suscripci\u00f3n' },
};

// ============================================================================
// Item Group/Category Translations — V4 (42 categorias)
// ============================================================================

/**
 * Translations for item categories/groups (item.category).
 * Keys match ItemCategory type values (V4 PascalCase).
 */
const ITEM_GROUP_TRANSLATIONS: Record<string, Record<Language, string>> = {
    // Alimentos Frescos
    'Produce': { en: 'Produce', es: 'Frutas y Verduras' },
    'MeatSeafood': { en: 'Meat & Seafood', es: 'Carnes y Mariscos' },
    'BreadPastry': { en: 'Bread & Pastries', es: 'Pan y Reposter\u00eda' },
    'DairyEggs': { en: 'Dairy & Eggs', es: 'L\u00e1cteos y Huevos' },
    // Alimentos Envasados
    'Pantry': { en: 'Pantry', es: 'Despensa' },
    'FrozenFoods': { en: 'Frozen Foods', es: 'Congelados' },
    'Snacks': { en: 'Snacks', es: 'Snacks y Golosinas' },
    'Beverages': { en: 'Beverages', es: 'Bebidas' },
    // Comida Preparada
    'PreparedFood': { en: 'Prepared Food', es: 'Comida Preparada' },
    // Salud y Cuidado Personal
    'BeautyCosmetics': { en: 'Beauty & Cosmetics', es: 'Belleza y Cosm\u00e9tica' },
    'PersonalCare': { en: 'Personal Care', es: 'Cuidado Personal' },
    'Medications': { en: 'Medications', es: 'Medicamentos' },
    'Supplements': { en: 'Supplements', es: 'Suplementos' },
    'BabyProducts': { en: 'Baby Products', es: 'Productos para Beb\u00e9' },
    // Hogar
    'CleaningSupplies': { en: 'Cleaning Supplies', es: 'Productos de Limpieza' },
    'HomeEssentials': { en: 'Home Essentials', es: 'Art\u00edculos del Hogar' },
    'PetSupplies': { en: 'Pet Supplies', es: 'Productos para Mascotas' },
    'PetFood': { en: 'Pet Food', es: 'Comida para Mascotas' },
    'Furnishings': { en: 'Furnishings', es: 'Mobiliario y Hogar' },
    // Productos Generales
    'Apparel': { en: 'Apparel', es: 'Vestuario' },
    'Technology': { en: 'Technology', es: 'Tecnolog\u00eda' },
    'Tools': { en: 'Tools & Supplies', es: 'Herramientas' },
    'Garden': { en: 'Garden', es: 'Jard\u00edn' },
    'CarAccessories': { en: 'Car Accessories', es: 'Accesorios de Auto' },
    'SportsOutdoors': { en: 'Sports & Outdoors', es: 'Deportes y Exterior' },
    'ToysGames': { en: 'Toys & Games', es: 'Juguetes y Juegos' },
    'BooksMedia': { en: 'Books & Media', es: 'Libros y Medios' },
    'OfficeStationery': { en: 'Office & Stationery', es: 'Oficina y Papeler\u00eda' },
    'Crafts': { en: 'Crafts', es: 'Manualidades' },
    // Servicios y Cargos
    'ServiceCharge': { en: 'Service Charge', es: 'Cargo por Servicio' },
    'TaxFees': { en: 'Tax & Fees', es: 'Impuestos y Cargos' },
    'Subscription': { en: 'Subscription', es: 'Suscripci\u00f3n' },
    'Insurance': { en: 'Insurance', es: 'Seguros' },
    'LoanPayment': { en: 'Loan Payment', es: 'Pago de Pr\u00e9stamo' },
    'TicketsEvents': { en: 'Tickets & Events', es: 'Entradas y Eventos' },
    'HouseholdBills': { en: 'Household Bills', es: 'Cuentas del Hogar' },
    'CondoFees': { en: 'Condo Fees', es: 'Gastos Comunes' },
    'EducationFees': { en: 'Education Fees', es: 'Gastos de Educaci\u00f3n' },
    // Vicios
    'Alcohol': { en: 'Alcohol', es: 'Alcohol' },
    'Tobacco': { en: 'Tobacco', es: 'Tabaco' },
    'GamesOfChance': { en: 'Games of Chance', es: 'Juegos de Azar' },
    // Otros
    'OtherItem': { en: 'Other Item', es: 'Otro Producto' },
    // Legacy V3 item category keys (for backward display compatibility)
    'Meat & Seafood': { en: 'Meat & Seafood', es: 'Carnes y Mariscos' },
    'Bakery': { en: 'Bakery', es: 'Panader\u00eda' },
    'Dairy & Eggs': { en: 'Dairy & Eggs', es: 'L\u00e1cteos y Huevos' },
    'Frozen Foods': { en: 'Frozen Foods', es: 'Congelados' },
    'Prepared Food': { en: 'Prepared Food', es: 'Comida Preparada' },
    'Health & Beauty': { en: 'Health & Beauty', es: 'Salud y Belleza' },
    'Personal Care': { en: 'Personal Care', es: 'Cuidado Personal' },
    'Pharmacy': { en: 'Pharmacy', es: 'Farmacia' },
    'Baby Products': { en: 'Baby Products', es: 'Productos para Beb\u00e9' },
    'Cleaning Supplies': { en: 'Cleaning Supplies', es: 'Productos de Limpieza' },
    'Household': { en: 'Household', es: 'Hogar' },
    'Pet Supplies': { en: 'Pet Supplies', es: 'Productos para Mascotas' },
    'Clothing': { en: 'Clothing', es: 'Ropa' },
    'Electronics': { en: 'Electronics', es: 'Electr\u00f3nica' },
    'Hardware': { en: 'Hardware', es: 'Ferreter\u00eda' },
    'Automotive': { en: 'Automotive', es: 'Automotriz' },
    'Sports & Outdoors': { en: 'Sports & Outdoors', es: 'Deportes y Exterior' },
    'Toys & Games': { en: 'Toys & Games', es: 'Juguetes y Juegos' },
    'Books & Media': { en: 'Books & Media', es: 'Libros y Medios' },
    'Office & Stationery': { en: 'Office & Stationery', es: 'Oficina y Papeler\u00eda' },
    'Crafts & Hobbies': { en: 'Crafts & Hobbies', es: 'Manualidades y Pasatiempos' },
    'Furniture': { en: 'Furniture', es: 'Muebles' },
    'Musical Instruments': { en: 'Musical Instruments', es: 'Instrumentos Musicales' },
    'Service': { en: 'Service', es: 'Servicio' },
    'Tax & Fees': { en: 'Tax & Fees', es: 'Impuestos y Cargos' },
    'Loan Payment': { en: 'Loan Payment', es: 'Pago de Pr\u00e9stamo' },
    'Tickets & Events': { en: 'Tickets & Events', es: 'Entradas y Eventos' },
    'Gambling': { en: 'Gambling', es: 'Apuestas' },
    'Other': { en: 'Other', es: 'Otro' },
    'Education': { en: 'Education', es: 'Educaci\u00f3n' },
    // Legacy variations (old data compatibility)
    'Condiments': { en: 'Condiments', es: 'Condimentos' },
    'Fresh Food': { en: 'Fresh Food', es: 'Alimentos Frescos' },
    'Drinks': { en: 'Drinks', es: 'Bebidas' },
    'Car': { en: 'Car', es: 'Auto' },
    // Store categories that might appear as item categories (legacy data)
    'HomeGoods': { en: 'Home Goods', es: 'Art\u00edculos del Hogar' },
    'OfficeSupplies': { en: 'Office Supplies', es: 'Art\u00edculos de Oficina' },
    'HealthBeauty': { en: 'Health & Beauty', es: 'Salud y Belleza' },
    'Butcher': { en: 'Butcher', es: 'Carnicer\u00eda' },
    'Jewelry': { en: 'Jewelry', es: 'Joyer\u00eda' },
    'Services': { en: 'Services', es: 'Servicios' },
};

// ============================================================================
// Common Subcategory Translations (AC #3)
// ============================================================================

/**
 * Translations for common subcategories (item.subcategory).
 * Best-effort translation - unknown subcategories fall back to original.
 */
const SUBCATEGORY_TRANSLATIONS: Record<string, Record<Language, string>> = {
    // Produce subcategories
    'Fruits': { en: 'Fruits', es: 'Frutas' },
    'Vegetables': { en: 'Vegetables', es: 'Verduras' },
    'Fresh Herbs': { en: 'Fresh Herbs', es: 'Hierbas Frescas' },
    'Organic': { en: 'Organic', es: 'Org\u00e1nico' },
    // Dairy subcategories
    'Milk': { en: 'Milk', es: 'Leche' },
    'Cheese': { en: 'Cheese', es: 'Queso' },
    'Yogurt': { en: 'Yogurt', es: 'Yogurt' },
    'Butter': { en: 'Butter', es: 'Mantequilla' },
    'Eggs': { en: 'Eggs', es: 'Huevos' },
    // Meat subcategories
    'Beef': { en: 'Beef', es: 'Carne de Res' },
    'Chicken': { en: 'Chicken', es: 'Pollo' },
    'Pork': { en: 'Pork', es: 'Cerdo' },
    'Fish': { en: 'Fish', es: 'Pescado' },
    'Seafood': { en: 'Seafood', es: 'Mariscos' },
    'Deli': { en: 'Deli', es: 'Fiambreria' },
    // Beverage subcategories
    'Water': { en: 'Water', es: 'Agua' },
    'Soft Drinks': { en: 'Soft Drinks', es: 'Bebidas Gaseosas' },
    'Juice': { en: 'Juice', es: 'Jugo' },
    'Coffee': { en: 'Coffee', es: 'Caf\u00e9' },
    'Tea': { en: 'Tea', es: 'T\u00e9' },
    'Beer': { en: 'Beer', es: 'Cerveza' },
    'Wine': { en: 'Wine', es: 'Vino' },
    // Bakery subcategories
    'Bread': { en: 'Bread', es: 'Pan' },
    'Pastries': { en: 'Pastries', es: 'Pasteler\u00eda' },
    'Cakes': { en: 'Cakes', es: 'Tortas' },
    // Personal Care subcategories
    'Shampoo': { en: 'Shampoo', es: 'Shampoo' },
    'Soap': { en: 'Soap', es: 'Jab\u00f3n' },
    'Toothpaste': { en: 'Toothpaste', es: 'Pasta de Dientes' },
    'Deodorant': { en: 'Deodorant', es: 'Desodorante' },
    // Cleaning subcategories
    'Laundry': { en: 'Laundry', es: 'Lavander\u00eda' },
    'Dish Soap': { en: 'Dish Soap', es: 'Lavalozas' },
    'Paper Products': { en: 'Paper Products', es: 'Productos de Papel' },
    // General
    'Sale': { en: 'Sale', es: 'Oferta' },
    'Discount': { en: 'Discount', es: 'Descuento' },
};

// ============================================================================
// Translation Function (AC #8 - Fallback behavior)
// ============================================================================

/**
 * Translates a category, group, or subcategory key to the user's language.
 *
 * Priority:
 * 1. Store categories (transaction.category)
 * 2. Item groups (item.category)
 * 3. Subcategories (item.subcategory)
 * 4. Fallback to original key if no translation exists (AC #8)
 *
 * @param key - The English category/group/subcategory key
 * @param lang - The target language ('en' | 'es')
 * @returns The translated string or the original key if no translation exists
 *
 * @example
 * translateCategory('Supermarket', 'es') // 'Supermercado'
 * translateCategory('DairyEggs', 'es') // 'Lacteos y Huevos'
 * translateCategory('Unknown', 'es') // 'Unknown' (fallback)
 */
export function translateCategory(key: string, lang: Language): string {
    // Handle empty/null keys
    if (!key) return key;

    // Try store category first
    if (STORE_CATEGORY_TRANSLATIONS[key]) {
        return STORE_CATEGORY_TRANSLATIONS[key][lang] || key;
    }

    // Try item group
    if (ITEM_GROUP_TRANSLATIONS[key]) {
        return ITEM_GROUP_TRANSLATIONS[key][lang] || key;
    }

    // Try subcategory
    if (SUBCATEGORY_TRANSLATIONS[key]) {
        return SUBCATEGORY_TRANSLATIONS[key][lang] || key;
    }

    // Fallback to original key (AC #8)
    return key;
}

/**
 * Translates a store category specifically.
 * Use when you know the value is a StoreCategory.
 *
 * @param category - The StoreCategory value
 * @param lang - The target language
 * @returns The translated category name
 */
export function translateStoreCategory(category: string, lang: Language): string {
    if (!category) return category;
    return STORE_CATEGORY_TRANSLATIONS[category]?.[lang] || category;
}

/**
 * Translates an item group/category specifically.
 * Use when you know the value is an ItemCategory.
 *
 * @param group - The ItemCategory value
 * @param lang - The target language
 * @returns The translated group name
 */
export function translateItemGroup(group: string, lang: Language): string {
    if (!group) return group;
    return ITEM_GROUP_TRANSLATIONS[group]?.[lang] || group;
}

/**
 * Normalizes an item group/category from any language to its canonical English key.
 * This is the reverse of translateItemGroup - it converts Spanish (or other)
 * category names back to English for consistent lookups.
 *
 * Example: 'Frutas y Verduras' -> 'Produce'
 *          'Snacks' -> 'Snacks'
 *          'Otro Producto' -> 'OtherItem'
 *
 * @param group - The item category in any language
 * @returns The canonical English key for the category
 */
export function normalizeItemGroupToEnglish(group: string): string {
    if (!group) return group;

    // If it's already a valid English key, return it
    if (ITEM_GROUP_TRANSLATIONS[group]) {
        return group;
    }

    // Search for a match in any language and return the English key
    for (const [englishKey, translations] of Object.entries(ITEM_GROUP_TRANSLATIONS)) {
        for (const translatedValue of Object.values(translations)) {
            if (translatedValue === group) {
                return englishKey;
            }
        }
    }

    // Fallback to original if no match found
    return group;
}

/**
 * Translates a subcategory.
 * Best-effort - returns original if no translation exists.
 *
 * @param subcategory - The subcategory value
 * @param lang - The target language
 * @returns The translated subcategory or original
 */
export function translateSubcategory(subcategory: string, lang: Language): string {
    if (!subcategory) return subcategory;
    return SUBCATEGORY_TRANSLATIONS[subcategory]?.[lang] || subcategory;
}

/**
 * Gets all store category options with translations for dropdowns (AC #6).
 * Returns array of { value, label } for use in select elements.
 * Value is English (canonical), label is translated.
 *
 * @param categories - Array of StoreCategory values
 * @param lang - The target language
 * @returns Array of { value: string, label: string }
 */
export function getTranslatedStoreCategoryOptions(
    categories: readonly string[],
    lang: Language
): Array<{ value: string; label: string }> {
    return categories.map(cat => ({
        value: cat, // Store in English (AC #7)
        label: translateStoreCategory(cat, lang),
    }));
}

// ============================================================================
// Store Category Group Translations — V4 (12 rubros)
// ============================================================================

/**
 * Translations for store category groups.
 * Keys match StoreCategoryGroup type from types.ts
 */
const STORE_CATEGORY_GROUP_TRANSLATIONS: Record<string, Record<Language, string>> = {
    'supermercados': { en: 'Supermarkets', es: 'Supermercados' },
    'restaurantes': { en: 'Restaurants', es: 'Restaurantes' },
    'comercio-barrio': { en: 'Neighborhood Shops', es: 'Comercio de Barrio' },
    'vivienda': { en: 'Housing', es: 'Vivienda' },
    'salud-bienestar': { en: 'Health & Wellness', es: 'Salud y Bienestar' },
    'tiendas-generales': { en: 'General Retail', es: 'Tiendas Generales' },
    'tiendas-especializadas': { en: 'Specialty Retail', es: 'Tiendas Especializadas' },
    'transporte-vehiculo': { en: 'Transport & Vehicle', es: 'Transporte y Veh\u00edculo' },
    'educacion': { en: 'Education', es: 'Educaci\u00f3n' },
    'servicios-finanzas': { en: 'Services & Finance', es: 'Servicios y Finanzas' },
    'entretenimiento-hospedaje': { en: 'Entertainment & Lodging', es: 'Entretenimiento y Hospedaje' },
    'otros': { en: 'Other', es: 'Otros' },
};

/**
 * Emoji mapping for store category groups.
 * Used in filter dropdowns and chips.
 */
export const STORE_CATEGORY_GROUP_EMOJIS: Record<string, string> = {
    'supermercados': '\uD83D\uDED2', // 🛒
    'restaurantes': '\uD83C\uDF7D\uFE0F', // 🍽️
    'comercio-barrio': '\uD83C\uDFEA', // 🏪
    'vivienda': '\uD83C\uDFE0', // 🏠
    'salud-bienestar': '\uD83D\uDC8A', // 💊
    'tiendas-generales': '\uD83C\uDFEC', // 🏬
    'tiendas-especializadas': '\uD83C\uDF81', // 🎁
    'transporte-vehiculo': '\uD83D\uDE97', // 🚗
    'educacion': '\uD83C\uDF93', // 🎓
    'servicios-finanzas': '\uD83C\uDFE2', // 🏢
    'entretenimiento-hospedaje': '\uD83C\uDFAD', // 🎭
    'otros': '\uD83D\uDCE6', // 📦
};

/**
 * Translates a store category group key to the user's language.
 * @param groupKey - The group key (e.g., 'supermercados')
 * @param lang - The target language ('en' | 'es')
 * @returns The translated group name or original key if no translation exists
 */
export function translateStoreCategoryGroup(groupKey: string, lang: Language): string {
    if (!groupKey) return groupKey;
    return STORE_CATEGORY_GROUP_TRANSLATIONS[groupKey]?.[lang] || groupKey;
}

/**
 * Gets the emoji for a store category group.
 * @param groupKey - The group key (e.g., 'supermercados')
 * @returns The emoji for the group or a default box emoji
 */
export function getStoreCategoryGroupEmoji(groupKey: string): string {
    return STORE_CATEGORY_GROUP_EMOJIS[groupKey] || '\uD83D\uDCE6'; // 📦
}

// ============================================================================
// Item Category Group Translations — V4 (9 familias)
// ============================================================================

/**
 * Translations for item category groups.
 * Keys match ItemCategoryGroup type from types.ts
 */
const ITEM_CATEGORY_GROUP_TRANSLATIONS: Record<string, Record<Language, string>> = {
    'food-fresh': { en: 'Fresh Food', es: 'Alimentos Frescos' },
    'food-packaged': { en: 'Packaged Food', es: 'Alimentos Envasados' },
    'food-prepared': { en: 'Prepared Food', es: 'Comida Preparada' },
    'salud-cuidado': { en: 'Health & Personal Care', es: 'Salud y Cuidado Personal' },
    'hogar': { en: 'Household', es: 'Hogar' },
    'productos-generales': { en: 'General Products', es: 'Productos Generales' },
    'servicios-cargos': { en: 'Services & Fees', es: 'Servicios y Cargos' },
    'vicios': { en: 'Vices', es: 'Vicios' },
    'otros-item': { en: 'Other', es: 'Otros' },
};

/**
 * Emoji mapping for item category groups.
 */
export const ITEM_CATEGORY_GROUP_EMOJIS: Record<string, string> = {
    'food-fresh': '\uD83E\uDD6C', // 🥬
    'food-packaged': '\uD83E\uDD6B', // 🥫
    'food-prepared': '\uD83C\uDF71', // 🍱
    'salud-cuidado': '\uD83D\uDC8A', // 💊
    'hogar': '\uD83C\uDFE0', // 🏠
    'productos-generales': '\uD83D\uDECD\uFE0F', // 🛍️
    'servicios-cargos': '\uD83D\uDCCB', // 📋
    'vicios': '\uD83D\uDEAC', // 🚬
    'otros-item': '\uD83D\uDCE6', // 📦
};

/**
 * Emoji mapping for individual item categories (V4 PascalCase keys).
 * Story 14.24: Each item category gets its own distinct emoji.
 */
export const ITEM_CATEGORY_EMOJIS: Record<string, string> = {
    // Alimentos Frescos
    'Produce': '\uD83E\uDD6C', // 🥬
    'MeatSeafood': '\uD83E\uDD69', // 🥩
    'BreadPastry': '\uD83E\uDD56', // 🥖
    'DairyEggs': '\uD83E\uDD5B', // 🥛
    // Alimentos Envasados
    'Pantry': '\uD83E\uDD6B', // 🥫
    'FrozenFoods': '\uD83E\uDDCA', // 🧊
    'Snacks': '\uD83C\uDF7F', // 🍿
    'Beverages': '\uD83E\uDD64', // 🥤
    // Comida Preparada
    'PreparedFood': '\uD83C\uDF71', // 🍱
    // Salud y Cuidado Personal
    'BeautyCosmetics': '\uD83D\uDC84', // 💄
    'PersonalCare': '\uD83E\uDDF4', // 🧴
    'Medications': '\uD83D\uDC8A', // 💊
    'Supplements': '\uD83D\uDCAA', // 💪
    'BabyProducts': '\uD83C\uDF7C', // 🍼
    // Hogar
    'CleaningSupplies': '\uD83E\uDDF9', // 🧹
    'HomeEssentials': '\uD83C\uDFE0', // 🏠
    'PetSupplies': '\uD83D\uDC3E', // 🐾
    'PetFood': '\uD83E\uDDB4', // 🦴
    'Furnishings': '\uD83E\uDE91', // 🪑
    // Productos Generales
    'Apparel': '\uD83D\uDC55', // 👕
    'Technology': '\uD83D\uDCF1', // 📱
    'Tools': '\uD83D\uDD27', // 🔧
    'Garden': '\uD83C\uDF31', // 🌱
    'CarAccessories': '\uD83D\uDE97', // 🚗
    'SportsOutdoors': '\u26BD', // ⚽
    'ToysGames': '\uD83C\uDFAE', // 🎮
    'BooksMedia': '\uD83D\uDCDA', // 📚
    'OfficeStationery': '\uD83D\uDCCE', // 📎
    'Crafts': '\uD83C\uDFA8', // 🎨
    // Servicios y Cargos
    'ServiceCharge': '\u2699\uFE0F', // ⚙️
    'TaxFees': '\uD83D\uDCCB', // 📋
    'Subscription': '\uD83D\uDCC5', // 📅
    'Insurance': '\uD83D\uDEE1\uFE0F', // 🛡️
    'LoanPayment': '\uD83D\uDCB3', // 💳
    'TicketsEvents': '\uD83C\uDF9F\uFE0F', // 🎟️
    'HouseholdBills': '\uD83D\uDCA1', // 💡
    'CondoFees': '\uD83C\uDFE2', // 🏢
    'EducationFees': '\uD83C\uDF93', // 🎓
    // Vicios
    'Alcohol': '\uD83C\uDF77', // 🍷
    'Tobacco': '\uD83D\uDEAC', // 🚬
    'GamesOfChance': '\uD83C\uDFB0', // 🎰
    // Otros
    'OtherItem': '\uD83D\uDCE6', // 📦
    // Legacy V3 keys (for backward display compatibility)
    'Meat & Seafood': '\uD83E\uDD69', // 🥩
    'Bakery': '\uD83E\uDD56', // 🥖
    'Dairy & Eggs': '\uD83E\uDD5B', // 🥛
    'Frozen Foods': '\uD83E\uDDCA', // 🧊
    'Prepared Food': '\uD83C\uDF71', // 🍱
    'Health & Beauty': '\uD83D\uDC84', // 💄
    'Personal Care': '\uD83E\uDDF4', // 🧴
    'Pharmacy': '\uD83D\uDC8A', // 💊
    'Baby Products': '\uD83C\uDF7C', // 🍼
    'Cleaning Supplies': '\uD83E\uDDF9', // 🧹
    'Household': '\uD83C\uDFE0', // 🏠
    'Pet Supplies': '\uD83D\uDC3E', // 🐾
    'Clothing': '\uD83D\uDC55', // 👕
    'Electronics': '\uD83D\uDCF1', // 📱
    'Hardware': '\uD83D\uDD27', // 🔧
    'Automotive': '\uD83D\uDE97', // 🚗
    'Sports & Outdoors': '\u26BD', // ⚽
    'Toys & Games': '\uD83C\uDFAE', // 🎮
    'Books & Media': '\uD83D\uDCDA', // 📚
    'Office & Stationery': '\uD83D\uDCCE', // 📎
    'Crafts & Hobbies': '\uD83C\uDFA8', // 🎨
    'Furniture': '\uD83E\uDE91', // 🪑
    'Musical Instruments': '\uD83C\uDFB8', // 🎸
    'Service': '\uD83D\uDD27', // 🔧
    'Tax & Fees': '\uD83D\uDCCB', // 📋
    'Loan Payment': '\uD83D\uDCB3', // 💳
    'Tickets & Events': '\uD83C\uDF9F\uFE0F', // 🎟️
    'Gambling': '\uD83C\uDFB0', // 🎰
    'Other': '\uD83D\uDCE6', // 📦
    'Education': '\uD83C\uDF93', // 🎓
    // Legacy variations
    'Condiments': '\uD83E\uDDC2', // 🧂
    'Fresh Food': '\uD83E\uDD6C', // 🥬
    'Drinks': '\uD83E\uDD64', // 🥤
    'Car': '\uD83D\uDE97', // 🚗
};

/**
 * Gets the emoji for a specific item category.
 * Falls back to group emoji if category not found, then to default.
 */
export function getItemCategoryEmoji(category: string): string {
    if (!category) return '\uD83D\uDCE6'; // 📦
    // First try exact category match
    if (ITEM_CATEGORY_EMOJIS[category]) {
        return ITEM_CATEGORY_EMOJIS[category];
    }
    // Fallback to default
    return '\uD83D\uDCE6'; // 📦
}

/**
 * Description/subtitle for each item category group.
 */
export const ITEM_CATEGORY_GROUP_DESCRIPTIONS: Record<string, Record<Language, string>> = {
    'food-fresh': {
        en: 'Produce, meat, seafood, dairy, and bread',
        es: 'Frutas, verduras, carnes, mariscos, l\u00e1cteos y pan',
    },
    'food-packaged': {
        en: 'Pantry items, frozen foods, snacks, and beverages',
        es: 'Despensa, congelados, snacks y bebidas',
    },
    'food-prepared': {
        en: 'Restaurant meals, takeout, and ready-to-eat food',
        es: 'Comida de restaurante, para llevar y lista para comer',
    },
    'salud-cuidado': {
        en: 'Beauty, cosmetics, medications, supplements, and baby products',
        es: 'Belleza, cosm\u00e9tica, medicamentos, suplementos y beb\u00e9',
    },
    'hogar': {
        en: 'Cleaning supplies, home essentials, pet supplies, and furnishings',
        es: 'Limpieza, hogar, mascotas y mobiliario',
    },
    'productos-generales': {
        en: 'Apparel, technology, tools, garden, sports, and more',
        es: 'Vestuario, tecnolog\u00eda, herramientas, jard\u00edn, deportes y m\u00e1s',
    },
    'servicios-cargos': {
        en: 'Service charges, taxes, fees, bills, and subscriptions',
        es: 'Servicios, impuestos, cargos, cuentas y suscripciones',
    },
    'vicios': {
        en: 'Alcohol, tobacco, and games of chance',
        es: 'Alcohol, tabaco y juegos de azar',
    },
    'otros-item': {
        en: 'Miscellaneous and uncategorized items',
        es: 'Art\u00edculos miscel\u00e1neos y sin categorizar',
    },
};

/**
 * Description/subtitle for each store category group.
 */
export const STORE_CATEGORY_GROUP_DESCRIPTIONS: Record<string, Record<Language, string>> = {
    'supermercados': {
        en: 'Supermarkets and wholesale stores',
        es: 'Supermercados y mayoristas',
    },
    'restaurantes': {
        en: 'Restaurants, cafes, bars, and fast food',
        es: 'Restaurantes, caf\u00e9s, bares y comida r\u00e1pida',
    },
    'comercio-barrio': {
        en: 'Corner stores, minimarkets, open markets, bakeries, butchers',
        es: 'Almacenes, minimarkets, ferias, panader\u00edas, carnicer\u00edas',
    },
    'vivienda': {
        en: 'Utility companies and property management',
        es: 'Servicios b\u00e1sicos y administraci\u00f3n',
    },
    'salud-bienestar': {
        en: 'Pharmacies, medical services, veterinary, and beauty',
        es: 'Farmacias, servicios m\u00e9dicos, veterinaria y belleza',
    },
    'tiendas-generales': {
        en: 'Bazaars, clothing, electronics, home goods, furniture, hardware',
        es: 'Bazares, ropa, electr\u00f3nica, hogar, muebles, ferreter\u00eda',
    },
    'tiendas-especializadas': {
        en: 'Pet shops, bookstores, sports, toys, accessories, online stores',
        es: 'Mascotas, librer\u00edas, deportes, juguetes, accesorios, tiendas online',
    },
    'transporte-vehiculo': {
        en: 'Auto shops, gas stations, and transportation',
        es: 'Talleres, bencineras y transporte',
    },
    'educacion': {
        en: 'Schools, courses, and tutoring',
        es: 'Colegios, cursos y clases particulares',
    },
    'servicios-finanzas': {
        en: 'General services, banking, travel, subscriptions, government',
        es: 'Servicios generales, banca, viajes, suscripciones, gobierno',
    },
    'entretenimiento-hospedaje': {
        en: 'Lodging, entertainment, and casinos',
        es: 'Hospedaje, entretenimiento y casinos',
    },
    'otros': {
        en: 'Charity, donations, and uncategorized',
        es: 'Caridad, donaciones y sin categorizar',
    },
};

/**
 * Translates an item category group key to the user's language.
 */
export function translateItemCategoryGroup(groupKey: string, lang: Language): string {
    if (!groupKey) return groupKey;
    return ITEM_CATEGORY_GROUP_TRANSLATIONS[groupKey]?.[lang] || groupKey;
}

/**
 * Gets the emoji for an item category group.
 */
export function getItemCategoryGroupEmoji(groupKey: string): string {
    return ITEM_CATEGORY_GROUP_EMOJIS[groupKey] || '\uD83D\uDCE6'; // 📦
}

/**
 * Gets the description for a store category group.
 */
export function getStoreCategoryGroupDescription(groupKey: string, lang: Language): string {
    return STORE_CATEGORY_GROUP_DESCRIPTIONS[groupKey]?.[lang] || '';
}

/**
 * Gets the description for an item category group.
 */
export function getItemCategoryGroupDescription(groupKey: string, lang: Language): string {
    return ITEM_CATEGORY_GROUP_DESCRIPTIONS[groupKey]?.[lang] || '';
}

// Export translation maps for testing
export {
    STORE_CATEGORY_TRANSLATIONS,
    ITEM_GROUP_TRANSLATIONS,
    SUBCATEGORY_TRANSLATIONS,
    STORE_CATEGORY_GROUP_TRANSLATIONS,
    ITEM_CATEGORY_GROUP_TRANSLATIONS,
};
