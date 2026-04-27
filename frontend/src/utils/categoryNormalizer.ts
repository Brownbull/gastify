/**
 * Category Normalizer Utility
 *
 * Story 14.15b: V3 Prompt Production Integration
 * Updated for V4 taxonomy (Story 17-2)
 *
 * Normalizes legacy category names (V1/V2/V3) to current V4 standard categories.
 * Also normalizes translated category names (e.g., Spanish) back to English
 * canonical keys for consistent lookups in analytics.
 *
 * Applied when reading transactions from Firestore to ensure consistent
 * category names across analytics, filtering, and display.
 *
 * LEGACY CATEGORY MAPPING:
 * - V1/V2 used different category names that need normalization
 * - V3 standardized categories but used space-separated item keys
 * - V4 uses PascalCase for all keys, zero cross-level overlaps
 *
 * LANGUAGE NORMALIZATION:
 * - Items may be stored with translated category names (e.g., Spanish)
 * - normalizeItemCategory() converts these to English canonical keys
 * - Example: 'Frutas y Verduras' -> 'Produce'
 *
 * USAGE:
 * - Apply normalizeItemCategory() when reading item.category from Firestore
 * - Apply normalizeStoreCategory() when reading tx.category from Firestore
 * - These are read-time normalizations - no need to migrate stored data
 *
 * @see docs/architecture/category-taxonomy-v2.md
 * @see shared/schema/categories.ts
 */

import { normalizeItemGroupToEnglish } from './categoryTranslations';

// ============================================================================
// Legacy Item Category Mappings (V1/V2/V3 -> V4)
// ============================================================================

/**
 * Maps legacy item category names to their V4 equivalents.
 * Keys are legacy names (V1/V2/V3), values are V4 standard names.
 * ADDITIVE: all old mappings are preserved, targets updated to V4.
 */
const LEGACY_ITEM_CATEGORY_MAP: Record<string, string> = {
  // ── V1/V2 -> V4 (updated targets) ──
  'Fresh Food': 'Produce',
  'Drinks': 'Beverages',
  'Drinks & Beverages': 'Beverages',
  'Pets': 'PetSupplies',
  'Tech': 'Technology',
  'Office': 'OfficeStationery',
  'Stationery': 'OfficeStationery',
  'Sports': 'SportsOutdoors',
  'Outdoors': 'SportsOutdoors',
  'Books': 'BooksMedia',
  'Media': 'BooksMedia',
  'Toys': 'ToysGames',
  'Games': 'ToysGames',
  'Hobbies': 'Crafts',
  'Meat': 'MeatSeafood',
  'Seafood': 'MeatSeafood',
  'Dairy': 'DairyEggs',
  'Eggs': 'DairyEggs',
  'Health': 'BeautyCosmetics',
  'Beauty': 'BeautyCosmetics',
  'Tickets': 'TicketsEvents',
  'Events': 'TicketsEvents',
  'Tax': 'TaxFees',
  'Fees': 'TaxFees',

  // ── V3 -> V4 (space-separated keys -> PascalCase) ──
  'Bakery': 'BreadPastry',
  'Meat & Seafood': 'MeatSeafood',
  'Dairy & Eggs': 'DairyEggs',
  'Frozen Foods': 'FrozenFoods',
  'Health & Beauty': 'BeautyCosmetics',
  'Personal Care': 'PersonalCare',
  'Pharmacy': 'Medications',
  'Baby Products': 'BabyProducts',
  'Cleaning Supplies': 'CleaningSupplies',
  'Household': 'HomeEssentials',
  'Pet Supplies': 'PetSupplies',
  'Clothing': 'Apparel',
  'Electronics': 'Technology',
  'Hardware': 'Tools',
  'Automotive': 'CarAccessories',
  'Sports & Outdoors': 'SportsOutdoors',
  'Toys & Games': 'ToysGames',
  'Books & Media': 'BooksMedia',
  'Office & Stationery': 'OfficeStationery',
  'Crafts & Hobbies': 'Crafts',
  'Furniture': 'Furnishings',
  'Musical Instruments': 'Technology',
  'Prepared Food': 'PreparedFood',
  'Service': 'ServiceCharge',
  'Tax & Fees': 'TaxFees',
  'Subscription': 'Subscription',
  'Insurance': 'Insurance',
  'Loan Payment': 'LoanPayment',
  'Tickets & Events': 'TicketsEvents',
  'Tobacco': 'Tobacco',
  'Gambling': 'GamesOfChance',
  'Education': 'EducationFees',
  'Other': 'OtherItem',

  // ── V1/V2 short names that now map to V4 (Apparel is canonical) ──
  'Apparel': 'Apparel',
};

/**
 * Maps legacy store category names to their V4 equivalents.
 * ADDITIVE: all V1/V2 mappings preserved, V3->V4 renames added.
 */
const LEGACY_STORE_CATEGORY_MAP: Record<string, string> = {
  // ── V1/V2 -> V4 (updated targets) ──
  'Beauty': 'HealthBeauty',
  'Salon': 'HealthBeauty',
  'Spa': 'HealthBeauty',
  'Pet Store': 'PetShop',
  'Pets': 'PetShop',
  'Parking': 'Transport',
  'Taxi': 'Transport',
  'Ride Share': 'Transport',
  'Public Transit': 'Transport',
  'Bus': 'Transport',
  'Metro': 'Transport',
  'Bookstore': 'BookStore',
  'Books': 'BookStore',
  'Home': 'HomeGoods',
  'Home Decor': 'HomeGoods',
  'Kitchenware': 'HomeGoods',
  'Garden': 'GardenCenter',
  'Plant Nursery': 'GardenCenter',
  'Office': 'OfficeSupplies',
  'Sports': 'SportsStore',
  'Outdoors': 'SportsStore',
  'Toy Store': 'ToyStore',
  'Game Shop': 'ToyStore',
  'Travel': 'TravelAgency',
  'Tour Operator': 'TravelAgency',
  'Hotel': 'Lodging',
  'Hostel': 'Lodging',
  'Bank': 'BankingFinance',
  'Finance': 'BankingFinance',
  'Insurance': 'BankingFinance',
  'Charity': 'CharityDonation',
  'Donation': 'CharityDonation',
  'Nonprofit': 'CharityDonation',

  // ── V3 -> V4 (renamed giros) ──
  'Clothing': 'ClothingStore',
  'Electronics': 'ElectronicsStore',
  'Furniture': 'FurnitureStore',
  'Automotive': 'AutoShop',
  'HotelLodging': 'Lodging',
  'Gambling': 'Casino',
  'Services': 'GeneralServices',
  'BooksMedia': 'BookStore',
  'SportsOutdoors': 'SportsStore',
  'ToysGames': 'ToyStore',
  'Subscription': 'SubscriptionService',

  // ── V3 -> V4 (removed giros mapped to closest V4) ──
  'StreetVendor': 'OpenMarket',
  'MusicStore': 'Entertainment',
  'Jewelry': 'AccessoriesOptical',
  'Optical': 'AccessoriesOptical',
};

// ============================================================================
// Normalizer Functions
// ============================================================================

/**
 * Normalize an item category name from legacy (V1/V2/V3) or translated to V4 standard English.
 *
 * This function handles two types of normalization:
 * 1. Legacy V1/V2/V3 names -> V4 standard (e.g., 'Bakery' -> 'BreadPastry')
 * 2. Translated names -> English canonical (e.g., 'Frutas y Verduras' -> 'Produce')
 *
 * @param category - The item category name from Firestore (may be legacy or translated)
 * @returns The normalized V4 English category name, or the original if no mapping exists
 *
 * @example
 * normalizeItemCategory('Bakery')              // Returns 'BreadPastry' (V3->V4)
 * normalizeItemCategory('Fresh Food')           // Returns 'Produce' (legacy V1/V2)
 * normalizeItemCategory('Frutas y Verduras')    // Returns 'Produce' (Spanish translation)
 * normalizeItemCategory('Produce')              // Returns 'Produce' (already V4 English)
 * normalizeItemCategory('Unknown')              // Returns 'Unknown' (no mapping)
 */
export function normalizeItemCategory(category: string): string {
  if (!category) return category;

  // First, try legacy V1/V2/V3 mapping
  if (LEGACY_ITEM_CATEGORY_MAP[category]) {
    return LEGACY_ITEM_CATEGORY_MAP[category];
  }

  // Then, try language normalization (Spanish -> English)
  const englishKey = normalizeItemGroupToEnglish(category);

  // If language normalization found a match, return it
  if (englishKey !== category) {
    return englishKey;
  }

  // Return original if no mapping found
  return category;
}

/**
 * Normalize a store category name from legacy (V1/V2/V3) to V4 standard.
 *
 * @param category - The store category name from Firestore
 * @returns The normalized V4 category name, or the original if no mapping exists
 *
 * @example
 * normalizeStoreCategory('Pet Store')    // Returns 'PetShop'
 * normalizeStoreCategory('Clothing')     // Returns 'ClothingStore' (V3->V4)
 * normalizeStoreCategory('Supermarket')  // Returns 'Supermarket' (already V4)
 * normalizeStoreCategory('Unknown')      // Returns 'Unknown' (no mapping)
 */
export function normalizeStoreCategory(category: string): string {
  if (!category) return category;
  return LEGACY_STORE_CATEGORY_MAP[category] || category;
}

/**
 * Check if a category name is a legacy (pre-V4) name that needs normalization.
 *
 * @param category - The category name to check
 * @param type - 'item' or 'store' to specify which mapping to check
 * @returns True if the category is a legacy name, false otherwise
 */
export function isLegacyCategory(category: string, type: 'item' | 'store'): boolean {
  if (!category) return false;
  const map = type === 'item' ? LEGACY_ITEM_CATEGORY_MAP : LEGACY_STORE_CATEGORY_MAP;
  return Object.prototype.hasOwnProperty.call(map, category);
}

/**
 * Get all legacy category mappings for reference/debugging.
 *
 * @returns Object containing both item and store legacy mappings
 */
export function getLegacyMappings(): {
  itemCategories: Record<string, string>;
  storeCategories: Record<string, string>;
} {
  return {
    itemCategories: { ...LEGACY_ITEM_CATEGORY_MAP },
    storeCategories: { ...LEGACY_STORE_CATEGORY_MAP },
  };
}
