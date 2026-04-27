/**
 * Story 14e-20b: Settings Zustand Store
 *
 * Zustand-based state management for app settings.
 * Persists theme, colorTheme, fontColorMode, and fontSize to localStorage.
 *
 * Migrates from legacy localStorage keys:
 * - 'colorTheme': 'ghibli' -> 'normal', 'default' -> 'professional'
 * - 'fontColorMode': validates 'colorful' | 'plain'
 * - 'fontSize': validates 'small' | 'normal'
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { Theme, ColorTheme, FontColorMode, FontSize, FontFamily, Language, Currency } from '@/types/settings';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import { getStorageString, setStorageString } from '@/utils/storage';

// =============================================================================
// Types
// =============================================================================

interface SettingsState {
  theme: Theme;
  colorTheme: ColorTheme;
  fontColorMode: FontColorMode;
  fontSize: FontSize;
  // Story 15-7c: fontFamily from Firestore preferences (not persisted to localStorage)
  fontFamily: FontFamily;
  // Story 14e-35: Locale settings migrated from App.tsx useState
  lang: Language;
  currency: Currency;
  dateFormat: 'LatAm' | 'US';
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  setFontColorMode: (fontColorMode: FontColorMode) => void;
  setFontSize: (fontSize: FontSize) => void;
  // Story 15-7c: fontFamily from Firestore (no localStorage persistence)
  setFontFamily: (fontFamily: FontFamily) => void;
  // Story 14e-35: Locale setting actions
  setLang: (lang: Language) => void;
  setCurrency: (currency: Currency) => void;
  setDateFormat: (dateFormat: 'LatAm' | 'US') => void;
}

// =============================================================================
// Default State
// =============================================================================

export const defaultSettingsState: SettingsState = {
  theme: 'light',
  colorTheme: 'mono',
  fontColorMode: 'colorful',
  fontSize: 'small',
  // Story 15-7c: fontFamily default (Firestore overrides on load)
  fontFamily: 'outfit',
  // Story 14e-35: Default locale settings (target market: Chile)
  lang: 'es',
  currency: DEFAULT_CURRENCY as Currency,
  dateFormat: 'LatAm',
};

// =============================================================================
// Migration from Legacy localStorage Keys
// =============================================================================

/**
 * Read legacy localStorage keys and migrate values to current format.
 * This function is called during store hydration to preserve user preferences.
 *
 * Migrations:
 * - colorTheme: 'ghibli' -> 'normal', 'default' -> 'professional'
 * - fontColorMode: validates 'colorful' | 'plain'
 * - fontSize: validates 'small' | 'normal'
 * - lang: validates 'es' | 'en' (Story 14e-35)
 * - currency: validates 'CLP' | 'USD' | 'EUR' (Story 14e-35)
 * - dateFormat: validates 'LatAm' | 'US' (Story 14e-35)
 *
 * Note: 'theme' (light/dark) is not persisted in legacy format, uses default.
 */
const migrateFromLegacyKeys = (): Partial<SettingsState> => {
  const result: Partial<SettingsState> = {};

  // Migrate colorTheme (handles ghibli->normal, default->professional)
  const savedColorTheme = getStorageString('colorTheme', '');
  if (savedColorTheme === 'ghibli') {
    result.colorTheme = 'normal';
  } else if (savedColorTheme === 'default') {
    result.colorTheme = 'professional';
  } else if (
    savedColorTheme === 'normal' ||
    savedColorTheme === 'professional' ||
    savedColorTheme === 'mono'
  ) {
    result.colorTheme = savedColorTheme;
  }

  // Migrate fontColorMode
  const savedFontColorMode = getStorageString('fontColorMode', '');
  if (savedFontColorMode === 'colorful' || savedFontColorMode === 'plain') {
    result.fontColorMode = savedFontColorMode;
  }

  // Migrate fontSize
  const savedFontSize = getStorageString('fontSize', '');
  if (savedFontSize === 'small' || savedFontSize === 'normal') {
    result.fontSize = savedFontSize;
  }

  // Story 14e-35: Migrate locale settings from legacy keys
  const savedLang = getStorageString('lang', '');
  if (savedLang === 'es' || savedLang === 'en') {
    result.lang = savedLang;
  }

  const savedCurrency = getStorageString('currency', '');
  if (savedCurrency === 'CLP' || savedCurrency === 'USD' || savedCurrency === 'EUR') {
    result.currency = savedCurrency;
  }

  const savedDateFormat = getStorageString('dateFormat', '');
  if (savedDateFormat === 'LatAm' || savedDateFormat === 'US') {
    result.dateFormat = savedDateFormat;
  }

  return result;
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  devtools(
    persist(
      (set) => ({
        // Initial state with legacy migration
        ...defaultSettingsState,

        // Actions
        // Note: We also write to plain localStorage keys for backward compatibility
        // with code that reads directly (e.g., categoryColors.ts getFontColorMode())
        setTheme: (theme) => {
          setStorageString('theme', theme);
          set({ theme }, false, 'settings/setTheme');
        },

        setColorTheme: (colorTheme) => {
          setStorageString('colorTheme', colorTheme);
          set({ colorTheme }, false, 'settings/setColorTheme');
        },

        setFontColorMode: (fontColorMode) => {
          setStorageString('fontColorMode', fontColorMode);
          set({ fontColorMode }, false, 'settings/setFontColorMode');
        },

        setFontSize: (fontSize) => {
          setStorageString('fontSize', fontSize);
          set({ fontSize }, false, 'settings/setFontSize');
        },

        // Story 15-7c: fontFamily from Firestore (no localStorage persistence)
        setFontFamily: (fontFamily) => {
          set({ fontFamily }, false, 'settings/setFontFamily');
        },

        // Story 14e-35: Locale setting actions
        setLang: (lang) => {
          setStorageString('lang', lang);
          set({ lang }, false, 'settings/setLang');
        },

        setCurrency: (currency) => {
          setStorageString('currency', currency);
          set({ currency }, false, 'settings/setCurrency');
        },

        setDateFormat: (dateFormat) => {
          setStorageString('dateFormat', dateFormat);
          set({ dateFormat }, false, 'settings/setDateFormat');
        },
      }),
      {
        name: 'boletapp-settings',
        storage: createJSONStorage(() => localStorage),
        // Story 15-7c: Exclude fontFamily from persistence (Firestore is source of truth)
        partialize: (state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { fontFamily, ...rest } = state;
          return rest;
        },
        // Merge function to apply legacy migration on first load
        merge: (persistedState, currentState) => {
          // If no persisted state, apply legacy migration
          if (!persistedState || typeof persistedState !== 'object') {
            const legacyValues = migrateFromLegacyKeys();
            return {
              ...currentState,
              ...legacyValues,
            };
          }
          // Otherwise, merge persisted state with current (persisted takes precedence)
          return {
            ...currentState,
            ...(persistedState as Partial<SettingsState>),
          };
        },
      }
    ),
    {
      name: 'settings-store',
      enabled: import.meta.env.DEV,
    }
  )
);

// =============================================================================
// Convenience Selectors (prevent unnecessary re-renders)
// =============================================================================

export const useThemeMode = () => useSettingsStore((state) => state.theme);
export const useColorTheme = () => useSettingsStore((state) => state.colorTheme);
export const useFontColorMode = () => useSettingsStore((state) => state.fontColorMode);
export const useFontSize = () => useSettingsStore((state) => state.fontSize);
// Story 15-7c: fontFamily selector
export const useFontFamily = () => useSettingsStore((state) => state.fontFamily);

// Story 14e-35: Locale selectors (prevent unnecessary re-renders)
export const useLang = () => useSettingsStore((state) => state.lang);
export const useCurrency = () => useSettingsStore((state) => state.currency);
export const useDateFormat = () => useSettingsStore((state) => state.dateFormat);

/**
 * Combined locale settings selector.
 * Use when you need all locale settings together (e.g., for passing to formatters).
 * Uses shallow comparison to prevent infinite re-renders.
 *
 * @example
 * // Use combined when you need multiple values together
 * const { lang, currency, dateFormat } = useLocaleSettings();
 *
 * // Use individual selectors when you only need one value (better re-render isolation)
 * const lang = useLang();
 */
export const useLocaleSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      lang: state.lang,
      currency: state.currency,
      dateFormat: state.dateFormat,
    }))
  );

/**
 * Story 15-7c: Combined theme + locale settings selector.
 * Replaces ThemeContext's useTheme() — returns all visual + locale settings.
 * Uses shallow comparison to prevent infinite re-renders.
 */
export const useThemeSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      theme: state.theme,
      colorTheme: state.colorTheme,
      fontColorMode: state.fontColorMode,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      lang: state.lang,
      currency: state.currency,
      dateFormat: state.dateFormat,
    }))
  );

// =============================================================================
// Direct Access (for non-React code)
// =============================================================================

/**
 * Get current settings state directly (non-reactive).
 * Use this in services or non-React code where hooks can't be used.
 */
export const getSettingsState = () => useSettingsStore.getState();

/**
 * Settings actions for non-React code.
 * Example: settingsActions.setTheme('dark')
 */
export const settingsActions = {
  setTheme: (theme: Theme) => useSettingsStore.getState().setTheme(theme),
  setColorTheme: (colorTheme: ColorTheme) =>
    useSettingsStore.getState().setColorTheme(colorTheme),
  setFontColorMode: (fontColorMode: FontColorMode) =>
    useSettingsStore.getState().setFontColorMode(fontColorMode),
  setFontSize: (fontSize: FontSize) =>
    useSettingsStore.getState().setFontSize(fontSize),
  // Story 15-7c: fontFamily action for non-React code
  setFontFamily: (fontFamily: FontFamily) =>
    useSettingsStore.getState().setFontFamily(fontFamily),
  // Story 14e-35: Locale actions for non-React code
  setLang: (lang: Language) => useSettingsStore.getState().setLang(lang),
  setCurrency: (currency: Currency) =>
    useSettingsStore.getState().setCurrency(currency),
  setDateFormat: (dateFormat: 'LatAm' | 'US') =>
    useSettingsStore.getState().setDateFormat(dateFormat),
};
