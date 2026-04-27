/**
 * Store category color definitions.
 * Split from categoryColors.ts (Story 14.21)
 * Updated for V4 taxonomy (Story 17-2)
 */

import type { StoreCategory, ThemeModeColors } from './types';

// ============================================================================
// STORE CATEGORY COLORS — 44 giros
// ============================================================================

export const STORE_CATEGORY_COLORS: Record<StoreCategory, ThemeModeColors> = {
  // --- SUPERMERCADOS ---
  Supermarket: {
    normal: { light: { fg: '#15803d', bg: '#dcfce7' }, dark: { fg: '#86efac', bg: '#14532d' } },
    professional: { light: { fg: '#16a34a', bg: '#dcfce7' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#2d8c50', bg: '#e0f2e8' }, dark: { fg: '#6dc792', bg: '#1e4a30' } },
  },
  Wholesale: {
    // Reuse Supermarket colors
    normal: { light: { fg: '#15803d', bg: '#dcfce7' }, dark: { fg: '#86efac', bg: '#14532d' } },
    professional: { light: { fg: '#16a34a', bg: '#dcfce7' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#2d8c50', bg: '#e0f2e8' }, dark: { fg: '#6dc792', bg: '#1e4a30' } },
  },

  // --- RESTAURANTES ---
  Restaurant: {
    normal: { light: { fg: '#c2410c', bg: '#ffedd5' }, dark: { fg: '#fdba74', bg: '#7c2d12' } },
    professional: { light: { fg: '#ea580c', bg: '#ffedd5' }, dark: { fg: '#fb923c', bg: '#9a3412' } },
    mono: { light: { fg: '#b86830', bg: '#f8e8d8' }, dark: { fg: '#d9a070', bg: '#4a2810' } },
  },

  // --- COMERCIO DE BARRIO ---
  Almacen: {
    normal: { light: { fg: '#78350f', bg: '#fef3c7' }, dark: { fg: '#fde68a', bg: '#451a03' } },
    professional: { light: { fg: '#92400e', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    mono: { light: { fg: '#8a5a20', bg: '#f8f0d8' }, dark: { fg: '#c4a050', bg: '#3a2808' } },
  },
  Minimarket: {
    // Similar to Almacen, slightly different shade
    normal: { light: { fg: '#854d0e', bg: '#fef9c3' }, dark: { fg: '#fef08a', bg: '#422006' } },
    professional: { light: { fg: '#a16207', bg: '#fef9c3' }, dark: { fg: '#facc15', bg: '#854d0e' } },
    mono: { light: { fg: '#8a6a20', bg: '#f8f4d8' }, dark: { fg: '#c4b050', bg: '#3a3008' } },
  },
  OpenMarket: {
    // From StreetVendor colors
    normal: { light: { fg: '#ea580c', bg: '#fff7ed' }, dark: { fg: '#fb923c', bg: '#7c2d12' } },
    professional: { light: { fg: '#f97316', bg: '#fff7ed' }, dark: { fg: '#fdba74', bg: '#9a3412' } },
    mono: { light: { fg: '#b85020', bg: '#f8e8d8' }, dark: { fg: '#d98858', bg: '#4a2010' } },
  },
  Kiosk: {
    // Similar to Almacen, different shade
    normal: { light: { fg: '#92400e', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    professional: { light: { fg: '#b45309', bg: '#fef3c7' }, dark: { fg: '#fbbf24', bg: '#92400e' } },
    mono: { light: { fg: '#8a6020', bg: '#f8f0d8' }, dark: { fg: '#c4a850', bg: '#3a2c08' } },
  },
  LiquorStore: {
    // Almacen colors
    normal: { light: { fg: '#78350f', bg: '#fef3c7' }, dark: { fg: '#fde68a', bg: '#451a03' } },
    professional: { light: { fg: '#92400e', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    mono: { light: { fg: '#8a5a20', bg: '#f8f0d8' }, dark: { fg: '#c4a050', bg: '#3a2808' } },
  },
  Bakery: {
    normal: { light: { fg: '#b45309', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7' }, dark: { fg: '#fbbf24', bg: '#92400e' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8' }, dark: { fg: '#d4b860', bg: '#4a3810' } },
  },
  Butcher: {
    normal: { light: { fg: '#b91c1c', bg: '#fee2e2' }, dark: { fg: '#fca5a5', bg: '#7f1d1d' } },
    professional: { light: { fg: '#dc2626', bg: '#fee2e2' }, dark: { fg: '#f87171', bg: '#991b1b' } },
    mono: { light: { fg: '#a83838', bg: '#f8e0e0' }, dark: { fg: '#d47070', bg: '#4a1818' } },
  },

  // --- VIVIENDA ---
  UtilityCompany: {
    // From Services colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4' }, dark: { fg: '#7098c8', bg: '#182840' } },
  },
  PropertyAdmin: {
    // From Services colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4' }, dark: { fg: '#7098c8', bg: '#182840' } },
  },

  // --- SALUD Y BIENESTAR ---
  Pharmacy: {
    normal: { light: { fg: '#be185d', bg: '#fce7f3' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#db2777', bg: '#fce7f3' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec' }, dark: { fg: '#d47098', bg: '#4a1830' } },
  },
  Medical: {
    normal: { light: { fg: '#9f1239', bg: '#ffe4e6' }, dark: { fg: '#fda4af', bg: '#881337' } },
    professional: { light: { fg: '#e11d48', bg: '#ffe4e6' }, dark: { fg: '#fb7185', bg: '#9f1239' } },
    mono: { light: { fg: '#b82840', bg: '#f8d8e0' }, dark: { fg: '#d46878', bg: '#4a1018' } },
  },
  Veterinary: {
    normal: { light: { fg: '#166534', bg: '#dcfce7' }, dark: { fg: '#86efac', bg: '#14532d' } },
    professional: { light: { fg: '#22c55e', bg: '#dcfce7' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#288c50', bg: '#d8f2e0' }, dark: { fg: '#68c790', bg: '#104a28' } },
  },
  HealthBeauty: {
    normal: { light: { fg: '#a21caf', bg: '#fae8ff' }, dark: { fg: '#e879f9', bg: '#701a75' } },
    professional: { light: { fg: '#c026d3', bg: '#fae8ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#9838a8', bg: '#f0e0f8' }, dark: { fg: '#c070d4', bg: '#3a1848' } },
  },

  // --- TIENDAS GENERALES ---
  Bazaar: {
    normal: { light: { fg: '#6d28d9', bg: '#ede9fe' }, dark: { fg: '#c4b5fd', bg: '#4c1d95' } },
    professional: { light: { fg: '#7c3aed', bg: '#ede9fe' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#6838a8', bg: '#e8e0f8' }, dark: { fg: '#a070d4', bg: '#2a1848' } },
  },
  ClothingStore: {
    // From Clothing colors
    normal: { light: { fg: '#be185d', bg: '#fdf2f8' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#ec4899', bg: '#fdf2f8' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec' }, dark: { fg: '#d47098', bg: '#4a1830' } },
  },
  ElectronicsStore: {
    // From Electronics colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3850a8', bg: '#e0e8f8' }, dark: { fg: '#7090d4', bg: '#182848' } },
  },
  HomeGoods: {
    normal: { light: { fg: '#0f766e', bg: '#ccfbf1' }, dark: { fg: '#5eead4', bg: '#134e4a' } },
    professional: { light: { fg: '#14b8a6', bg: '#ccfbf1' }, dark: { fg: '#2dd4bf', bg: '#115e59' } },
    mono: { light: { fg: '#288c8c', bg: '#d8f2f2' }, dark: { fg: '#60c8c8', bg: '#104848' } },
  },
  FurnitureStore: {
    // From Furniture colors
    normal: { light: { fg: '#115e59', bg: '#ccfbf1' }, dark: { fg: '#5eead4', bg: '#134e4a' } },
    professional: { light: { fg: '#0d9488', bg: '#ccfbf1' }, dark: { fg: '#2dd4bf', bg: '#115e59' } },
    mono: { light: { fg: '#30708c', bg: '#d8e8f0' }, dark: { fg: '#68a8c0', bg: '#103848' } },
  },
  Hardware: {
    normal: { light: { fg: '#374151', bg: '#f3f4f6' }, dark: { fg: '#d1d5db', bg: '#1f2937' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6' }, dark: { fg: '#9ca3af', bg: '#374151' } },
    mono: { light: { fg: '#506878', bg: '#e8ecf0' }, dark: { fg: '#90a8b8', bg: '#283038' } },
  },
  GardenCenter: {
    normal: { light: { fg: '#166534', bg: '#d1fae5' }, dark: { fg: '#6ee7b7', bg: '#064e3b' } },
    professional: { light: { fg: '#22c55e', bg: '#d1fae5' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#28a050', bg: '#d8f8e0' }, dark: { fg: '#60d488', bg: '#104820' } },
  },

  // --- TIENDAS ESPECIALIZADAS ---
  PetShop: {
    normal: { light: { fg: '#a21caf', bg: '#fdf4ff' }, dark: { fg: '#f0abfc', bg: '#701a75' } },
    professional: { light: { fg: '#d946ef', bg: '#fdf4ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#a03890', bg: '#f8e0f4' }, dark: { fg: '#d068c0', bg: '#481838' } },
  },
  BookStore: {
    // From BooksMedia colors
    normal: { light: { fg: '#1d4ed8', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#3b82f6', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3068a8', bg: '#d8e8f8' }, dark: { fg: '#68a0d4', bg: '#103048' } },
  },
  OfficeSupplies: {
    normal: { light: { fg: '#475569', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#5878a0', bg: '#e8f0f8' }, dark: { fg: '#90b0d0', bg: '#283848' } },
  },
  SportsStore: {
    // From SportsOutdoors colors
    normal: { light: { fg: '#047857', bg: '#d1fae5' }, dark: { fg: '#6ee7b7', bg: '#064e3b' } },
    professional: { light: { fg: '#10b981', bg: '#d1fae5' }, dark: { fg: '#34d399', bg: '#065f46' } },
    mono: { light: { fg: '#289070', bg: '#d8f2ec' }, dark: { fg: '#60c8a8', bg: '#104838' } },
  },
  ToyStore: {
    // From ToysGames colors
    normal: { light: { fg: '#7c3aed', bg: '#ede9fe' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#ede9fe' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f8' }, dark: { fg: '#a868d0', bg: '#301840' } },
  },
  AccessoriesOptical: {
    // From Optical colors
    normal: { light: { fg: '#0369a1', bg: '#e0f2fe' }, dark: { fg: '#7dd3fc', bg: '#0c4a6e' } },
    professional: { light: { fg: '#0ea5e9', bg: '#e0f2fe' }, dark: { fg: '#38bdf8', bg: '#0369a1' } },
    mono: { light: { fg: '#2878a0', bg: '#d8ecf8' }, dark: { fg: '#60b0d0', bg: '#103848' } },
  },
  OnlineStore: {
    // From Electronics colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3850a8', bg: '#e0e8f8' }, dark: { fg: '#7090d4', bg: '#182848' } },
  },

  // --- TRANSPORTE Y VEHICULO ---
  AutoShop: {
    // From Automotive colors
    normal: { light: { fg: '#374151', bg: '#f3f4f6' }, dark: { fg: '#d1d5db', bg: '#1f2937' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6' }, dark: { fg: '#9ca3af', bg: '#374151' } },
    mono: { light: { fg: '#507080', bg: '#e8ecf0' }, dark: { fg: '#90a8b8', bg: '#283438' } },
  },
  GasStation: {
    normal: { light: { fg: '#92400e', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7' }, dark: { fg: '#fbbf24', bg: '#92400e' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8' }, dark: { fg: '#d4b860', bg: '#483810' } },
  },
  Transport: {
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3858a8', bg: '#e0e8f8' }, dark: { fg: '#7098d4', bg: '#182848' } },
  },

  // --- SERVICIOS Y FINANZAS ---
  GeneralServices: {
    // From Services colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4' }, dark: { fg: '#7098c8', bg: '#182840' } },
  },
  BankingFinance: {
    normal: { light: { fg: '#1e3a8a', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#1d4ed8', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#284880', bg: '#dce4f0' }, dark: { fg: '#6088b8', bg: '#102038' } },
  },
  TravelAgency: {
    normal: { light: { fg: '#0284c7', bg: '#e0f2fe' }, dark: { fg: '#7dd3fc', bg: '#075985' } },
    professional: { light: { fg: '#0ea5e9', bg: '#e0f2fe' }, dark: { fg: '#38bdf8', bg: '#0369a1' } },
    mono: { light: { fg: '#2888a0', bg: '#d8f0f8' }, dark: { fg: '#60c0d0', bg: '#104048' } },
  },
  SubscriptionService: {
    // From Subscription colors
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f4' }, dark: { fg: '#a868c8', bg: '#301838' } },
  },
  Government: {
    normal: { light: { fg: '#475569', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#475569' } },
    mono: { light: { fg: '#506070', bg: '#e8ecf0' }, dark: { fg: '#90a0b0', bg: '#283038' } },
  },

  // --- EDUCACION ---
  Education: {
    normal: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e40af' } },
    professional: { light: { fg: '#3b82f6', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3068a0', bg: '#d8e8f8' }, dark: { fg: '#68a0d0', bg: '#103040' } },
  },

  // --- ENTRETENIMIENTO Y HOSPEDAJE ---
  Lodging: {
    // From HotelLodging colors
    normal: { light: { fg: '#44403c', bg: '#f5f5f4' }, dark: { fg: '#d6d3d1', bg: '#292524' } },
    professional: { light: { fg: '#57534e', bg: '#f5f5f4' }, dark: { fg: '#a8a29e', bg: '#44403c' } },
    mono: { light: { fg: '#786858', bg: '#f4f0e8' }, dark: { fg: '#b8a890', bg: '#383020' } },
  },
  Entertainment: {
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f4' }, dark: { fg: '#a868c8', bg: '#301838' } },
  },
  Casino: {
    // From Gambling colors
    normal: { light: { fg: '#be123c', bg: '#ffe4e6' }, dark: { fg: '#fda4af', bg: '#9f1239' } },
    professional: { light: { fg: '#e11d48', bg: '#ffe4e6' }, dark: { fg: '#fb7185', bg: '#be123c' } },
    mono: { light: { fg: '#b83050', bg: '#f8e0e4' }, dark: { fg: '#e07890', bg: '#501028' } },
  },

  // --- OTROS ---
  CharityDonation: {
    normal: { light: { fg: '#047857', bg: '#d1fae5' }, dark: { fg: '#6ee7b7', bg: '#064e3b' } },
    professional: { light: { fg: '#10b981', bg: '#d1fae5' }, dark: { fg: '#34d399', bg: '#065f46' } },
    mono: { light: { fg: '#289068', bg: '#d8f2e8' }, dark: { fg: '#60c8a0', bg: '#104838' } },
  },
  Other: {
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },
};
