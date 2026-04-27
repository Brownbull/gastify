/**
 * Category Emoji Mapping
 *
 * Story 11.2: Quick Save Card Component (AC #8)
 * Updated for V4 taxonomy (Story 17-2)
 * Maps store categories to representative emojis for visual display.
 */

import type { StoreCategory } from '../../shared/schema/categories';

/**
 * Emoji mapping for store categories (V4 — 44 giros).
 * Each category is mapped to a representative emoji.
 */
const CATEGORY_EMOJI_MAP: Record<StoreCategory, string> = {
  // Supermercados
  Supermarket: '\uD83D\uDED2', // 🛒
  Wholesale: '\uD83D\uDCE6', // 📦

  // Restaurantes
  Restaurant: '\uD83C\uDF7D\uFE0F', // 🍽️

  // Comercio de Barrio
  Almacen: '\uD83C\uDFEA', // 🏪
  Minimarket: '\uD83D\uDECD\uFE0F', // 🛍️
  OpenMarket: '\uD83C\uDF3F', // 🌿
  Kiosk: '\uD83D\uDDDE\uFE0F', // 🗞️
  LiquorStore: '\uD83C\uDF7E', // 🍾
  Bakery: '\uD83E\uDD50', // 🥐
  Butcher: '\uD83E\uDD69', // 🥩

  // Vivienda
  UtilityCompany: '\uD83D\uDCA1', // 💡
  PropertyAdmin: '\uD83C\uDFD7\uFE0F', // 🏗️

  // Salud y Bienestar
  Pharmacy: '\uD83D\uDC8A', // 💊
  Medical: '\uD83C\uDFE5', // 🏥
  Veterinary: '\uD83D\uDC3E', // 🐾
  HealthBeauty: '\uD83D\uDC84', // 💄

  // Tiendas Generales
  Bazaar: '\uD83C\uDFEA', // 🏪
  ClothingStore: '\uD83D\uDC54', // 👔
  ElectronicsStore: '\uD83D\uDCBB', // 💻
  HomeGoods: '\uD83C\uDFE0', // 🏠
  FurnitureStore: '\uD83D\uDECB\uFE0F', // 🛋️
  Hardware: '\uD83D\uDD27', // 🔧
  GardenCenter: '\uD83C\uDF31', // 🌱

  // Tiendas Especializadas
  PetShop: '\uD83D\uDC15', // 🐕
  BookStore: '\uD83D\uDCD6', // 📖
  OfficeSupplies: '\uD83D\uDCCE', // 📎
  SportsStore: '\uD83C\uDFC5', // 🏅
  ToyStore: '\uD83E\uDDF8', // 🧸
  AccessoriesOptical: '\uD83D\uDC53', // 👓
  OnlineStore: '\uD83C\uDF10', // 🌐

  // Transporte y Vehiculo
  AutoShop: '\uD83D\uDD27', // 🔧
  GasStation: '\u26FD', // ⛽
  Transport: '\uD83D\uDE8C', // 🚌

  // Servicios y Finanzas
  GeneralServices: '\u2699\uFE0F', // ⚙️
  BankingFinance: '\uD83C\uDFE6', // 🏦
  TravelAgency: '\u2708\uFE0F', // ✈️
  SubscriptionService: '\uD83D\uDCF2', // 📲
  Government: '\uD83C\uDFDB\uFE0F', // 🏛️

  // Educacion
  Education: '\uD83D\uDCD6', // 📖

  // Entretenimiento y Hospedaje
  Lodging: '\uD83C\uDFE8', // 🏨
  Entertainment: '\uD83C\uDFAC', // 🎬
  Casino: '\uD83C\uDFB0', // 🎰

  // Otros
  CharityDonation: '\u2764\uFE0F', // ❤️
  Other: '\uD83D\uDCE6', // 📦
};

/**
 * Get the emoji for a store category.
 *
 * @param category - The store category
 * @returns The emoji representing the category, or a default box emoji for unknown categories
 *
 * @example
 * getCategoryEmoji('Supermarket') // Returns '🛒'
 * getCategoryEmoji('Restaurant')  // Returns '🍽️'
 * getCategoryEmoji('Unknown')     // Returns '📦' (default)
 */
export function getCategoryEmoji(category: StoreCategory | string): string {
  // Check if it's a valid StoreCategory
  if (category in CATEGORY_EMOJI_MAP) {
    return CATEGORY_EMOJI_MAP[category as StoreCategory];
  }

  // Default fallback for unknown categories
  return '\uD83D\uDCE6'; // 📦
}

/**
 * Get all category-emoji pairs.
 * Useful for rendering category pickers or legend displays.
 *
 * @returns Array of objects with category and emoji
 */
export function getAllCategoryEmojis(): Array<{ category: StoreCategory; emoji: string }> {
  return Object.entries(CATEGORY_EMOJI_MAP).map(([category, emoji]) => ({
    category: category as StoreCategory,
    emoji,
  }));
}

export default getCategoryEmoji;
