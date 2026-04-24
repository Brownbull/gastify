/**
 * Item category color definitions.
 * Split from categoryColors.ts (Story 14.21)
 * Updated for V4 taxonomy (Story 17-2) — keys are now ItemCategory (PascalCase)
 */

import type { ItemCategoryKey, ThemeModeColors } from './types';

// ============================================================================
// ITEM CATEGORY COLORS — 42 categorias
// ============================================================================

export const ITEM_CATEGORY_COLORS: Record<ItemCategoryKey, ThemeModeColors> = {
  // --- ALIMENTOS FRESCOS ---
  Produce: {
    normal: { light: { fg: '#15803d', bg: '#dcfce7' }, dark: { fg: '#86efac', bg: '#14532d' } },
    professional: { light: { fg: '#16a34a', bg: '#dcfce7' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#2d8c50', bg: '#e0f2e8' }, dark: { fg: '#6dc792', bg: '#1e4a30' } },
  },
  MeatSeafood: {
    normal: { light: { fg: '#b91c1c', bg: '#fee2e2' }, dark: { fg: '#fca5a5', bg: '#7f1d1d' } },
    professional: { light: { fg: '#dc2626', bg: '#fee2e2' }, dark: { fg: '#f87171', bg: '#991b1b' } },
    mono: { light: { fg: '#a83838', bg: '#f8e0e0' }, dark: { fg: '#d47070', bg: '#4a1818' } },
  },
  BreadPastry: {
    // From ItemBakery colors
    normal: { light: { fg: '#b45309', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7' }, dark: { fg: '#fbbf24', bg: '#92400e' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8' }, dark: { fg: '#d4b860', bg: '#4a3810' } },
  },
  DairyEggs: {
    normal: { light: { fg: '#166534', bg: '#dcfce7' }, dark: { fg: '#86efac', bg: '#14532d' } },
    professional: { light: { fg: '#22c55e', bg: '#dcfce7' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#288c50', bg: '#d8f2e0' }, dark: { fg: '#68c790', bg: '#104a28' } },
  },

  // --- ALIMENTOS ENVASADOS ---
  Pantry: {
    normal: { light: { fg: '#92400e', bg: '#fef3c7' }, dark: { fg: '#fcd34d', bg: '#78350f' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7' }, dark: { fg: '#fbbf24', bg: '#92400e' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8' }, dark: { fg: '#d4b860', bg: '#4a3810' } },
  },
  FrozenFoods: {
    normal: { light: { fg: '#0369a1', bg: '#e0f2fe' }, dark: { fg: '#7dd3fc', bg: '#0c4a6e' } },
    professional: { light: { fg: '#0ea5e9', bg: '#e0f2fe' }, dark: { fg: '#38bdf8', bg: '#0369a1' } },
    mono: { light: { fg: '#2080a8', bg: '#d8ecf8' }, dark: { fg: '#58b8d8', bg: '#104050' } },
  },
  Snacks: {
    normal: { light: { fg: '#ea580c', bg: '#fff7ed' }, dark: { fg: '#fb923c', bg: '#7c2d12' } },
    professional: { light: { fg: '#f97316', bg: '#fff7ed' }, dark: { fg: '#fdba74', bg: '#9a3412' } },
    mono: { light: { fg: '#b86830', bg: '#f8e8d8' }, dark: { fg: '#d9a070', bg: '#4a2810' } },
  },
  Beverages: {
    normal: { light: { fg: '#0284c7', bg: '#e0f2fe' }, dark: { fg: '#7dd3fc', bg: '#075985' } },
    professional: { light: { fg: '#0ea5e9', bg: '#e0f2fe' }, dark: { fg: '#38bdf8', bg: '#0369a1' } },
    mono: { light: { fg: '#2088a8', bg: '#d8f0f8' }, dark: { fg: '#58c0d8', bg: '#104050' } },
  },

  // --- COMIDA PREPARADA ---
  PreparedFood: {
    normal: { light: { fg: '#c2410c', bg: '#ffedd5' }, dark: { fg: '#fdba74', bg: '#7c2d12' } },
    professional: { light: { fg: '#ea580c', bg: '#ffedd5' }, dark: { fg: '#fb923c', bg: '#9a3412' } },
    mono: { light: { fg: '#b86830', bg: '#f8e8d8' }, dark: { fg: '#d9a070', bg: '#4a2810' } },
  },

  // --- SALUD Y CUIDADO PERSONAL ---
  BeautyCosmetics: {
    // From HealthBeautyItem colors
    normal: { light: { fg: '#a21caf', bg: '#fae8ff' }, dark: { fg: '#e879f9', bg: '#701a75' } },
    professional: { light: { fg: '#c026d3', bg: '#fae8ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#9838a8', bg: '#f0e0f8' }, dark: { fg: '#c070d4', bg: '#3a1848' } },
  },
  PersonalCare: {
    normal: { light: { fg: '#be185d', bg: '#fce7f3' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#db2777', bg: '#fce7f3' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec' }, dark: { fg: '#d47098', bg: '#4a1830' } },
  },
  Medications: {
    // From PharmacyItem colors
    normal: { light: { fg: '#be185d', bg: '#fce7f3' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#db2777', bg: '#fce7f3' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec' }, dark: { fg: '#d47098', bg: '#4a1830' } },
  },
  Supplements: {
    normal: { light: { fg: '#a21caf', bg: '#fdf4ff' }, dark: { fg: '#f0abfc', bg: '#701a75' } },
    professional: { light: { fg: '#d946ef', bg: '#fdf4ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#a03890', bg: '#f8e0f4' }, dark: { fg: '#d068c0', bg: '#481838' } },
  },
  BabyProducts: {
    normal: { light: { fg: '#be185d', bg: '#fdf2f8' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#ec4899', bg: '#fdf2f8' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#b04878', bg: '#f8e0f0' }, dark: { fg: '#d880a8', bg: '#481828' } },
  },

  // --- HOGAR ---
  CleaningSupplies: {
    normal: { light: { fg: '#0f766e', bg: '#ccfbf1' }, dark: { fg: '#5eead4', bg: '#134e4a' } },
    professional: { light: { fg: '#14b8a6', bg: '#ccfbf1' }, dark: { fg: '#2dd4bf', bg: '#115e59' } },
    mono: { light: { fg: '#288c8c', bg: '#d8f2f2' }, dark: { fg: '#60c8c8', bg: '#104848' } },
  },
  HomeEssentials: {
    // From Household colors
    normal: { light: { fg: '#0f766e', bg: '#ccfbf1' }, dark: { fg: '#5eead4', bg: '#134e4a' } },
    professional: { light: { fg: '#14b8a6', bg: '#ccfbf1' }, dark: { fg: '#2dd4bf', bg: '#115e59' } },
    mono: { light: { fg: '#288c8c', bg: '#d8f2f2' }, dark: { fg: '#60c8c8', bg: '#104848' } },
  },
  PetSupplies: {
    normal: { light: { fg: '#a21caf', bg: '#fdf4ff' }, dark: { fg: '#f0abfc', bg: '#701a75' } },
    professional: { light: { fg: '#d946ef', bg: '#fdf4ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#a03890', bg: '#f8e0f4' }, dark: { fg: '#d068c0', bg: '#481838' } },
  },
  PetFood: {
    // Reuse PetSupplies colors
    normal: { light: { fg: '#a21caf', bg: '#fdf4ff' }, dark: { fg: '#f0abfc', bg: '#701a75' } },
    professional: { light: { fg: '#d946ef', bg: '#fdf4ff' }, dark: { fg: '#e879f9', bg: '#86198f' } },
    mono: { light: { fg: '#a03890', bg: '#f8e0f4' }, dark: { fg: '#d068c0', bg: '#481838' } },
  },
  Furnishings: {
    // From FurnitureItem colors
    normal: { light: { fg: '#115e59', bg: '#ccfbf1' }, dark: { fg: '#5eead4', bg: '#134e4a' } },
    professional: { light: { fg: '#0d9488', bg: '#ccfbf1' }, dark: { fg: '#2dd4bf', bg: '#115e59' } },
    mono: { light: { fg: '#30708c', bg: '#d8e8f0' }, dark: { fg: '#68a8c0', bg: '#103848' } },
  },

  // --- PRODUCTOS GENERALES ---
  Apparel: {
    // From ClothingItem colors
    normal: { light: { fg: '#be185d', bg: '#fdf2f8' }, dark: { fg: '#f9a8d4', bg: '#831843' } },
    professional: { light: { fg: '#ec4899', bg: '#fdf2f8' }, dark: { fg: '#f472b6', bg: '#9d174d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec' }, dark: { fg: '#d47098', bg: '#4a1830' } },
  },
  Technology: {
    // From ElectronicsItem colors
    normal: { light: { fg: '#1e40af', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3850a8', bg: '#e0e8f8' }, dark: { fg: '#7090d4', bg: '#182848' } },
  },
  Tools: {
    // From HardwareItem colors
    normal: { light: { fg: '#374151', bg: '#f3f4f6' }, dark: { fg: '#d1d5db', bg: '#1f2937' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6' }, dark: { fg: '#9ca3af', bg: '#374151' } },
    mono: { light: { fg: '#506878', bg: '#e8ecf0' }, dark: { fg: '#90a8b8', bg: '#283038' } },
  },
  Garden: {
    normal: { light: { fg: '#166534', bg: '#d1fae5' }, dark: { fg: '#6ee7b7', bg: '#064e3b' } },
    professional: { light: { fg: '#22c55e', bg: '#d1fae5' }, dark: { fg: '#4ade80', bg: '#166534' } },
    mono: { light: { fg: '#28a050', bg: '#d8f8e0' }, dark: { fg: '#60d488', bg: '#104820' } },
  },
  CarAccessories: {
    // From AutomotiveItem colors
    normal: { light: { fg: '#374151', bg: '#f3f4f6' }, dark: { fg: '#d1d5db', bg: '#1f2937' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6' }, dark: { fg: '#9ca3af', bg: '#374151' } },
    mono: { light: { fg: '#507080', bg: '#e8ecf0' }, dark: { fg: '#90a8b8', bg: '#283438' } },
  },
  SportsOutdoors: {
    // From SportsOutdoorsItem colors
    normal: { light: { fg: '#047857', bg: '#d1fae5' }, dark: { fg: '#6ee7b7', bg: '#064e3b' } },
    professional: { light: { fg: '#10b981', bg: '#d1fae5' }, dark: { fg: '#34d399', bg: '#065f46' } },
    mono: { light: { fg: '#289070', bg: '#d8f2ec' }, dark: { fg: '#60c8a8', bg: '#104838' } },
  },
  ToysGames: {
    // From ToysGamesItem colors
    normal: { light: { fg: '#7c3aed', bg: '#ede9fe' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#ede9fe' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f8' }, dark: { fg: '#a868d0', bg: '#301840' } },
  },
  BooksMedia: {
    // From BooksMediaItem colors
    normal: { light: { fg: '#1d4ed8', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#3b82f6', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#3068a8', bg: '#d8e8f8' }, dark: { fg: '#68a0d4', bg: '#103048' } },
  },
  OfficeStationery: {
    normal: { light: { fg: '#475569', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#5878a0', bg: '#e8f0f8' }, dark: { fg: '#90b0d0', bg: '#283848' } },
  },
  Crafts: {
    // From CraftsHobbies colors
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f8' }, dark: { fg: '#a868d0', bg: '#301840' } },
  },

  // --- SERVICIOS Y CARGOS ---
  ServiceCharge: {
    // From Service colors
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4' }, dark: { fg: '#7098c8', bg: '#182840' } },
  },
  TaxFees: {
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },
  Subscription: {
    // From SubscriptionItem colors
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f4' }, dark: { fg: '#a868c8', bg: '#301838' } },
  },
  Insurance: {
    // From InsuranceItem colors
    normal: { light: { fg: '#1e3a8a', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#1d4ed8', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#284880', bg: '#dce4f0' }, dark: { fg: '#6088b8', bg: '#102038' } },
  },
  LoanPayment: {
    normal: { light: { fg: '#1e3a8a', bg: '#dbeafe' }, dark: { fg: '#93c5fd', bg: '#1e3a8a' } },
    professional: { light: { fg: '#1d4ed8', bg: '#dbeafe' }, dark: { fg: '#60a5fa', bg: '#1e40af' } },
    mono: { light: { fg: '#284880', bg: '#dce4f0' }, dark: { fg: '#6088b8', bg: '#102038' } },
  },
  TicketsEvents: {
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff' }, dark: { fg: '#c4b5fd', bg: '#5b21b6' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#7040a0', bg: '#ece0f8' }, dark: { fg: '#a070d0', bg: '#301840' } },
  },
  HouseholdBills: {
    // Reuse TaxFees colors
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },
  CondoFees: {
    // Reuse TaxFees colors
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },
  EducationFees: {
    // Reuse TaxFees colors
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },

  // --- VICIOS ---
  Alcohol: {
    normal: { light: { fg: '#6d28d9', bg: '#ede9fe' }, dark: { fg: '#c4b5fd', bg: '#4c1d95' } },
    professional: { light: { fg: '#7c3aed', bg: '#ede9fe' }, dark: { fg: '#a78bfa', bg: '#5b21b6' } },
    mono: { light: { fg: '#6838a8', bg: '#e8e0f8' }, dark: { fg: '#a070d4', bg: '#2a1848' } },
  },
  Tobacco: {
    normal: { light: { fg: '#374151', bg: '#f3f4f6' }, dark: { fg: '#d1d5db', bg: '#1f2937' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6' }, dark: { fg: '#9ca3af', bg: '#374151' } },
    mono: { light: { fg: '#686050', bg: '#f0ece8' }, dark: { fg: '#a89888', bg: '#383020' } },
  },
  GamesOfChance: {
    // From GamblingItem colors
    normal: { light: { fg: '#be123c', bg: '#ffe4e6' }, dark: { fg: '#fda4af', bg: '#9f1239' } },
    professional: { light: { fg: '#e11d48', bg: '#ffe4e6' }, dark: { fg: '#fb7185', bg: '#be123c' } },
    mono: { light: { fg: '#b83050', bg: '#f8e0e4' }, dark: { fg: '#e07890', bg: '#501028' } },
  },

  // --- OTROS ---
  OtherItem: {
    normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
  },
};
