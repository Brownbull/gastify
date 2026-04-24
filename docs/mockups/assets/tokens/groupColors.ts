/**
 * Group-level color definitions for store and item category groups.
 * Split from categoryColors.ts (Story 14.21)
 * Updated for V4 taxonomy (Story 17-2)
 */

import type {
  StoreCategoryGroup,
  ItemCategoryGroup,
  GroupThemeModeColors,
} from './types';

// ============================================================================
// STORE GROUP COLORS — 12 rubros
// ============================================================================

export const STORE_GROUP_COLORS: Record<StoreCategoryGroup, GroupThemeModeColors> = {
  'supermercados': {
    normal: { light: { fg: '#15803d', bg: '#dcfce7', border: '#86efac' }, dark: { fg: '#86efac', bg: '#14532d', border: '#22c55e' } },
    professional: { light: { fg: '#16a34a', bg: '#dcfce7', border: '#4ade80' }, dark: { fg: '#4ade80', bg: '#166534', border: '#22c55e' } },
    mono: { light: { fg: '#2d8c50', bg: '#e0f2e8', border: '#6dc792' }, dark: { fg: '#6dc792', bg: '#1e4a30', border: '#3a6a48' } },
  },
  'restaurantes': {
    normal: { light: { fg: '#c2410c', bg: '#ffedd5', border: '#fdba74' }, dark: { fg: '#fdba74', bg: '#7c2d12', border: '#ea580c' } },
    professional: { light: { fg: '#ea580c', bg: '#ffedd5', border: '#fb923c' }, dark: { fg: '#fb923c', bg: '#9a3412', border: '#ea580c' } },
    mono: { light: { fg: '#b86830', bg: '#f8e8d8', border: '#d9a070' }, dark: { fg: '#d9a070', bg: '#4a2810', border: '#6a4020' } },
  },
  'comercio-barrio': {
    normal: { light: { fg: '#b45309', bg: '#fef3c7', border: '#fcd34d' }, dark: { fg: '#fcd34d', bg: '#78350f', border: '#92400e' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7', border: '#fbbf24' }, dark: { fg: '#fbbf24', bg: '#92400e', border: '#b45309' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8', border: '#d4b860' }, dark: { fg: '#d4b860', bg: '#4a3810', border: '#6a5020' } },
  },
  'vivienda': {
    normal: { light: { fg: '#1e40af', bg: '#dbeafe', border: '#93c5fd' }, dark: { fg: '#93c5fd', bg: '#1e3a8a', border: '#2563eb' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe', border: '#60a5fa' }, dark: { fg: '#60a5fa', bg: '#1e40af', border: '#3b82f6' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4', border: '#7098c8' }, dark: { fg: '#7098c8', bg: '#182840', border: '#304060' } },
  },
  'salud-bienestar': {
    normal: { light: { fg: '#be185d', bg: '#fce7f3', border: '#f9a8d4' }, dark: { fg: '#f9a8d4', bg: '#831843', border: '#9d174d' } },
    professional: { light: { fg: '#db2777', bg: '#fce7f3', border: '#f472b6' }, dark: { fg: '#f472b6', bg: '#9d174d', border: '#be185d' } },
    mono: { light: { fg: '#a83868', bg: '#f8e0ec', border: '#d47098' }, dark: { fg: '#d47098', bg: '#4a1830', border: '#6a2848' } },
  },
  'tiendas-generales': {
    normal: { light: { fg: '#0f766e', bg: '#ccfbf1', border: '#5eead4' }, dark: { fg: '#5eead4', bg: '#134e4a', border: '#14b8a6' } },
    professional: { light: { fg: '#14b8a6', bg: '#ccfbf1', border: '#2dd4bf' }, dark: { fg: '#2dd4bf', bg: '#115e59', border: '#0d9488' } },
    mono: { light: { fg: '#288c8c', bg: '#d8f2f2', border: '#60c8c8' }, dark: { fg: '#60c8c8', bg: '#104848', border: '#286868' } },
  },
  'tiendas-especializadas': {
    normal: { light: { fg: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' }, dark: { fg: '#c4b5fd', bg: '#5b21b6', border: '#7c3aed' } },
    professional: { light: { fg: '#8b5cf6', bg: '#ede9fe', border: '#a78bfa' }, dark: { fg: '#a78bfa', bg: '#5b21b6', border: '#7c3aed' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f8', border: '#a868d0' }, dark: { fg: '#a868d0', bg: '#301840', border: '#502860' } },
  },
  'transporte-vehiculo': {
    normal: { light: { fg: '#374151', bg: '#f3f4f6', border: '#d1d5db' }, dark: { fg: '#d1d5db', bg: '#1f2937', border: '#4b5563' } },
    professional: { light: { fg: '#4b5563', bg: '#f3f4f6', border: '#9ca3af' }, dark: { fg: '#9ca3af', bg: '#374151', border: '#6b7280' } },
    mono: { light: { fg: '#507080', bg: '#e8ecf0', border: '#90a8b8' }, dark: { fg: '#90a8b8', bg: '#283438', border: '#405058' } },
  },
  'educacion': {
    normal: { light: { fg: '#2563eb', bg: '#dbeafe', border: '#93c5fd' }, dark: { fg: '#93c5fd', bg: '#1e40af', border: '#3b82f6' } },
    professional: { light: { fg: '#3b82f6', bg: '#dbeafe', border: '#60a5fa' }, dark: { fg: '#60a5fa', bg: '#1e40af', border: '#2563eb' } },
    mono: { light: { fg: '#3068a0', bg: '#d8e8f8', border: '#68a0d0' }, dark: { fg: '#68a0d0', bg: '#103040', border: '#284858' } },
  },
  'servicios-finanzas': {
    normal: { light: { fg: '#1e40af', bg: '#dbeafe', border: '#93c5fd' }, dark: { fg: '#93c5fd', bg: '#1e3a8a', border: '#2563eb' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe', border: '#60a5fa' }, dark: { fg: '#60a5fa', bg: '#1e40af', border: '#3b82f6' } },
    mono: { light: { fg: '#385898', bg: '#e0e8f4', border: '#7098c8' }, dark: { fg: '#7098c8', bg: '#182840', border: '#304060' } },
  },
  'entretenimiento-hospedaje': {
    normal: { light: { fg: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' }, dark: { fg: '#c4b5fd', bg: '#5b21b6', border: '#7c3aed' } },
    professional: { light: { fg: '#8b5cf6', bg: '#f5f3ff', border: '#a78bfa' }, dark: { fg: '#a78bfa', bg: '#5b21b6', border: '#7c3aed' } },
    mono: { light: { fg: '#7838a0', bg: '#ece0f4', border: '#a868c8' }, dark: { fg: '#a868c8', bg: '#301838', border: '#502858' } },
  },
  'otros': {
    normal: { light: { fg: '#047857', bg: '#d1fae5', border: '#6ee7b7' }, dark: { fg: '#6ee7b7', bg: '#064e3b', border: '#10b981' } },
    professional: { light: { fg: '#10b981', bg: '#d1fae5', border: '#34d399' }, dark: { fg: '#34d399', bg: '#065f46', border: '#059669' } },
    mono: { light: { fg: '#289068', bg: '#d8f2e8', border: '#60c8a0' }, dark: { fg: '#60c8a0', bg: '#104838', border: '#286850' } },
  },
};

// ============================================================================
// ITEM GROUP COLORS — 9 familias
// ============================================================================

export const ITEM_GROUP_COLORS: Record<ItemCategoryGroup, GroupThemeModeColors> = {
  'food-fresh': {
    normal: { light: { fg: '#15803d', bg: '#dcfce7', border: '#86efac' }, dark: { fg: '#86efac', bg: '#14532d', border: '#22c55e' } },
    professional: { light: { fg: '#16a34a', bg: '#dcfce7', border: '#4ade80' }, dark: { fg: '#4ade80', bg: '#166534', border: '#22c55e' } },
    mono: { light: { fg: '#2d8c50', bg: '#e0f2e8', border: '#6dc792' }, dark: { fg: '#6dc792', bg: '#1e4a30', border: '#3a6a48' } },
  },
  'food-packaged': {
    normal: { light: { fg: '#92400e', bg: '#fef3c7', border: '#fcd34d' }, dark: { fg: '#fcd34d', bg: '#78350f', border: '#d97706' } },
    professional: { light: { fg: '#d97706', bg: '#fef3c7', border: '#fbbf24' }, dark: { fg: '#fbbf24', bg: '#92400e', border: '#b45309' } },
    mono: { light: { fg: '#a88020', bg: '#f8f0d8', border: '#d4b860' }, dark: { fg: '#d4b860', bg: '#4a3810', border: '#6a5020' } },
  },
  'food-prepared': {
    normal: { light: { fg: '#c2410c', bg: '#ffedd5', border: '#fdba74' }, dark: { fg: '#fdba74', bg: '#7c2d12', border: '#ea580c' } },
    professional: { light: { fg: '#ea580c', bg: '#ffedd5', border: '#fb923c' }, dark: { fg: '#fb923c', bg: '#9a3412', border: '#ea580c' } },
    mono: { light: { fg: '#b86830', bg: '#f8e8d8', border: '#d9a070' }, dark: { fg: '#d9a070', bg: '#4a2810', border: '#6a4020' } },
  },
  'salud-cuidado': {
    normal: { light: { fg: '#a21caf', bg: '#fae8ff', border: '#e879f9' }, dark: { fg: '#e879f9', bg: '#701a75', border: '#a855f7' } },
    professional: { light: { fg: '#c026d3', bg: '#fae8ff', border: '#e879f9' }, dark: { fg: '#e879f9', bg: '#86198f', border: '#a855f7' } },
    mono: { light: { fg: '#9838a8', bg: '#f0e0f8', border: '#c070d4' }, dark: { fg: '#c070d4', bg: '#3a1848', border: '#582868' } },
  },
  'hogar': {
    normal: { light: { fg: '#0f766e', bg: '#ccfbf1', border: '#5eead4' }, dark: { fg: '#5eead4', bg: '#134e4a', border: '#14b8a6' } },
    professional: { light: { fg: '#14b8a6', bg: '#ccfbf1', border: '#2dd4bf' }, dark: { fg: '#2dd4bf', bg: '#115e59', border: '#0d9488' } },
    mono: { light: { fg: '#288c8c', bg: '#d8f2f2', border: '#60c8c8' }, dark: { fg: '#60c8c8', bg: '#104848', border: '#286868' } },
  },
  'productos-generales': {
    normal: { light: { fg: '#1e40af', bg: '#dbeafe', border: '#93c5fd' }, dark: { fg: '#93c5fd', bg: '#1e3a8a', border: '#2563eb' } },
    professional: { light: { fg: '#2563eb', bg: '#dbeafe', border: '#60a5fa' }, dark: { fg: '#60a5fa', bg: '#1e40af', border: '#3b82f6' } },
    mono: { light: { fg: '#3850a8', bg: '#e0e8f8', border: '#7090d4' }, dark: { fg: '#7090d4', bg: '#182848', border: '#304068' } },
  },
  'servicios-cargos': {
    normal: { light: { fg: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }, dark: { fg: '#cbd5e1', bg: '#334155', border: '#64748b' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9', border: '#94a3b8' }, dark: { fg: '#94a3b8', bg: '#475569', border: '#64748b' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0', border: '#98a8b8' }, dark: { fg: '#98a8b8', bg: '#303840', border: '#485058' } },
  },
  'vicios': {
    normal: { light: { fg: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd' }, dark: { fg: '#c4b5fd', bg: '#4c1d95', border: '#7c3aed' } },
    professional: { light: { fg: '#7c3aed', bg: '#ede9fe', border: '#a78bfa' }, dark: { fg: '#a78bfa', bg: '#5b21b6', border: '#7c3aed' } },
    mono: { light: { fg: '#6838a8', bg: '#e8e0f8', border: '#a070d4' }, dark: { fg: '#a070d4', bg: '#2a1848', border: '#4a2868' } },
  },
  'otros-item': {
    normal: { light: { fg: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }, dark: { fg: '#cbd5e1', bg: '#334155', border: '#64748b' } },
    professional: { light: { fg: '#64748b', bg: '#f1f5f9', border: '#94a3b8' }, dark: { fg: '#94a3b8', bg: '#475569', border: '#64748b' } },
    mono: { light: { fg: '#607080', bg: '#e8ecf0', border: '#98a8b8' }, dark: { fg: '#98a8b8', bg: '#303840', border: '#485058' } },
  },
};
