/**
 * Story 14e-25c.1: useSettingsViewData Hook
 *
 * Composition hook that encapsulates all SettingsView data needs.
 * This hook owns data fetching, allowing SettingsView to own its data
 * without prop drilling from App.tsx.
 *
 * Architecture:
 * - Calls useAuth() for user/services
 * - Calls useThemeSettings() for theme/locale settings
 * - Calls useUserPreferences() for user profile and preferences
 * - Calls useUserCredits() for subscription/credit data
 * - Calls useMerchantMappings() for merchant mappings
 * - Calls useTrustedMerchants() for trusted merchant list
 * - Calls useItemNameMappings() for item name mappings
 * - Gets settingsSubview from useNavigationStore()
 * - Provides translation function internally
 *
 * Data Organization (per story Dev Notes):
 * - profile: displayName, email, phone, birthDate, setters
 * - preferences: lang, currency, dateFormat, location, setters
 * - theme: theme, colorTheme, fontFamily, setters
 * - subscription: plan, credits, superCredits, daysUntilReset
 * - mappings: categories, subcategories, merchants, itemNames, trusted
 * - navigation: subview, setSubview
 * - account: signOut, wipeDB, exportAll, wiping, exporting
 * - t: Translation function
 *
 * @example
 * ```tsx
 * function SettingsView() {
 *   const data = useSettingsViewData();
 *   // All data comes from hook - no props needed
 * }
 * ```
 */

import { useMemo, useCallback } from 'react';
import type { Firestore } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
// Story 15-7c: Theme settings from Zustand store (ThemeContext removed)
import { useThemeSettings } from '@/shared/stores';
import { useSettingsStore } from '@/shared/stores/useSettingsStore';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useMerchantMappings } from '@/hooks/useMerchantMappings';
import { useTrustedMerchants } from '@/hooks/useTrustedMerchants';
import { useItemNameMappings } from '@/hooks/useItemNameMappings';
import {
    useNavigationStore,
    useSettingsSubview,
} from '@/shared/stores/useNavigationStore';
import { useCategoriesContextOptional } from '@features/categories';
import { TRANSLATIONS } from '@/utils/translations';
import type { SettingsSubView } from '@/types/settings';
import type { SupportedCurrency, ForeignLocationDisplayFormat } from '@/types/preferences';
import type { CategoryMapping } from '@/types/categoryMapping';
import type { SubcategoryMapping } from '@/types/subcategoryMapping';
import type { MerchantMapping } from '@/types/merchantMapping';
import type { TrustedMerchant } from '@/types/trust';
import type { ItemNameMapping } from '@/types/itemNameMapping';
import type { StoreCategory } from '../../../../../shared/schema/categories';
import type {
    Language,
    Theme,
    ColorTheme,
    FontColorMode,
    FontSize,
    FontFamily,
} from '@/types/settings';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// =============================================================================
// Types
// =============================================================================

/**
 * Profile data for SettingsView
 */
export interface ProfileData {
    displayName: string;
    email: string;
    phoneNumber: string;
    birthDate: string;
    setDisplayName: (name: string) => void;
    setPhoneNumber: (phone: string) => void;
    setBirthDate: (date: string) => void;
}

/**
 * Preferences data for SettingsView
 */
export interface PreferencesData {
    lang: Language;
    currency: string;
    dateFormat: 'LatAm' | 'US';
    defaultCountry: string;
    defaultCity: string;
    defaultScanCurrency: SupportedCurrency;
    foreignLocationFormat: ForeignLocationDisplayFormat;
    setLang: (lang: Language) => void;
    setCurrency: (currency: string) => void;
    setDateFormat: (format: 'LatAm' | 'US') => void;
    setDefaultCountry: (country: string) => void;
    setDefaultCity: (city: string) => void;
    setDefaultScanCurrency: (currency: SupportedCurrency) => void;
    setForeignLocationFormat: (format: ForeignLocationDisplayFormat) => void;
}

/**
 * Theme data for SettingsView
 */
export interface ThemeData {
    theme: Theme;
    colorTheme: ColorTheme;
    fontColorMode: FontColorMode;
    fontFamily: FontFamily;
    fontSize: FontSize;
    setTheme: (theme: Theme) => void;
    setColorTheme: (colorTheme: ColorTheme) => void;
    setFontColorMode: (mode: FontColorMode) => void;
    setFontFamily: (family: FontFamily) => void;
    setFontSize: (size: FontSize) => void;
}

/**
 * Subscription data for SettingsView
 */
export interface SubscriptionData {
    plan: 'freemium' | 'pro' | 'business';
    creditsRemaining: number;
    superCreditsRemaining: number;
    daysUntilReset: number;
}

/**
 * Mapping CRUD operations interface
 */
export interface MappingOperations<T> {
    data: T[];
    loading: boolean;
    delete: (id: string) => Promise<void>;
    update: (id: string, newValue: string) => Promise<void>;
}

/**
 * Trusted merchant operations (slightly different API)
 */
export interface TrustedMerchantOperations {
    data: TrustedMerchant[];
    loading: boolean;
    revoke: (merchantName: string) => Promise<void>;
}

/**
 * All mappings data for SettingsView
 */
export interface MappingsData {
    categories: MappingOperations<CategoryMapping>;
    subcategories: MappingOperations<SubcategoryMapping>;
    merchants: MappingOperations<MerchantMapping>;
    itemNames: MappingOperations<ItemNameMapping>;
    trusted: TrustedMerchantOperations;
    clearAll: () => Promise<void>;
}

/**
 * Navigation data for SettingsView
 */
export interface NavigationData {
    subview: SettingsSubView;
    setSubview: (subview: SettingsSubView) => void;
}

/**
 * Account actions for SettingsView
 */
export interface AccountActions {
    signOut: () => Promise<void>;
    wipeDB: () => Promise<void>;
    exportAll: () => void;
    wiping: boolean;
    exporting: boolean;
}

/**
 * Return type for useSettingsViewData hook.
 *
 * Story 14e-25c.1: Complete data for SettingsView organized by domain.
 */
export interface UseSettingsViewDataReturn {
    // === Organized Data ===
    profile: ProfileData;
    preferences: PreferencesData;
    theme: ThemeData;
    subscription: SubscriptionData;
    mappings: MappingsData;
    navigation: NavigationData;
    account: AccountActions;

    // === Firebase Context (for subviews that need it) ===
    db: Firestore | null;
    userId: string | null;
    appId: string | null;

    // === Translation ===
    t: (key: string) => string;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useSettingsViewData - Composition hook for SettingsView data.
 *
 * Story 14e-25c.1: Provides ALL data SettingsView needs.
 * Encapsulates all data fetching, settings, and formatters that were
 * previously passed as props from App.tsx.
 *
 * Data sources:
 * 1. useAuth() - user/services
 * 2. useThemeSettings() - theme/locale settings
 * 3. useUserPreferences() - profile and preferences
 * 4. useUserCredits() - subscription data
 * 5. useMerchantMappings() - merchant mappings
 * 6. useTrustedMerchants() - trusted merchants
 * 7. useItemNameMappings() - item name mappings
 * 8. useCategoriesContext() - category/subcategory mappings
 * 9. Navigation store - settings subview state
 *
 * @returns UseSettingsViewDataReturn - All data needed by SettingsView
 */
export function useSettingsViewData(): UseSettingsViewDataReturn {
    // === Auth & Services ===
    const { user, services, signOut: authSignOut } = useAuth();
    const db = services?.db ?? null;
    const userId = user?.uid ?? null;
    const appId = services?.appId ?? null;

    // === Theme/Locale Settings ===
    // Story 15-7c: All settings from Zustand store (ThemeContext removed)
    const { fontFamily, lang, currency, dateFormat } = useThemeSettings();

    // Read visual settings from useSettingsStore
    const theme = useSettingsStore((state) => state.theme);
    const colorTheme = useSettingsStore((state) => state.colorTheme);
    const fontColorMode = useSettingsStore((state) => state.fontColorMode);
    const fontSize = useSettingsStore((state) => state.fontSize);

    // Get setters from useSettingsStore
    const setTheme = useSettingsStore((state) => state.setTheme);
    const setColorTheme = useSettingsStore((state) => state.setColorTheme);
    const setFontColorMode = useSettingsStore((state) => state.setFontColorMode);
    const setFontSize = useSettingsStore((state) => state.setFontSize);
    const setLang = useSettingsStore((state) => state.setLang);
    const setCurrency = useSettingsStore((state) => state.setCurrency);
    const setDateFormat = useSettingsStore((state) => state.setDateFormat);

    // === User Preferences ===
    const {
        preferences,
        setDefaultCountry,
        setDefaultCity,
        setDisplayName,
        setPhoneNumber,
        setBirthDate,
        setFontFamily,
        setForeignLocationFormat,
        setDefaultCurrency,
    } = useUserPreferences(user, services);

    // === Credits/Subscription ===
    const { credits } = useUserCredits(user);

    // === Mappings ===
    // Merchant mappings
    const {
        mappings: merchantMappings,
        loading: merchantMappingsLoading,
        deleteMapping: deleteMerchantMapping,
        updateMapping: updateMerchantMapping,
    } = useMerchantMappings(user, services);

    // Trusted merchants
    const {
        trustedMerchants,
        loading: trustedMerchantsLoading,
        removeTrust,
    } = useTrustedMerchants(user, services);

    // Item name mappings
    const {
        mappings: itemNameMappings,
        loading: itemNameMappingsLoading,
        deleteMapping: deleteItemNameMapping,
        updateMapping: updateItemNameMapping,
    } = useItemNameMappings(user, services);

    // Category/subcategory mappings from CategoriesContext
    const categoriesContext = useCategoriesContextOptional();

    // === Navigation ===
    const settingsSubview = useSettingsSubview();
    const setSettingsSubview = useNavigationStore((s) => s.setSettingsSubview);

    // === Account Action States ===
    // Story 14e-25c.1: wiping/exporting states are provided via _testOverrides from App.tsx.
    // Local defaults are always false since placeholder actions throw errors.
    const wiping = false;
    const exporting = false;

    // === Translation Function ===
    const t = useCallback(
        (key: string): string => {
            const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
            return (translations as Record<string, string>)[key] || key;
        },
        [lang]
    );

    // === Account Actions ===
    const handleSignOut = useCallback(async () => {
        await authSignOut();
    }, [authSignOut]);

    const handleWipeDB = useCallback(async () => {
        // Story 14e-25c.1: wipeDB requires App-level state coordination.
        // Must be provided via _testOverrides from App.tsx.
        // Throwing ensures this misconfiguration is caught immediately.
        throw new Error(
            '[useSettingsViewData] wipeDB not provided. ' +
            'This action requires App-level state coordination via _testOverrides.'
        );
    }, []);

    const handleExportAll = useCallback(() => {
        // Story 14e-25c.1: exportAll requires App-level services.
        // Must be provided via _testOverrides from App.tsx.
        // Throwing ensures this misconfiguration is caught immediately.
        throw new Error(
            '[useSettingsViewData] exportAll not provided. ' +
            'This action requires App-level services via _testOverrides.'
        );
    }, []);

    // === Clear All Learned Data ===
    const handleClearAllLearnedData = useCallback(async () => {
        // Clear all mappings in parallel
        const deletePromises: Promise<void>[] = [];

        // Clear category mappings
        if (categoriesContext?.categoryMappings) {
            categoriesContext.categoryMappings.forEach((mapping) => {
                if (mapping.id && categoriesContext.deleteCategoryMapping) {
                    deletePromises.push(categoriesContext.deleteCategoryMapping(mapping.id));
                }
            });
        }

        // Clear subcategory mappings
        if (categoriesContext?.subcategoryMappings) {
            categoriesContext.subcategoryMappings.forEach((mapping) => {
                if (mapping.id && categoriesContext.deleteSubcategoryMapping) {
                    deletePromises.push(categoriesContext.deleteSubcategoryMapping(mapping.id));
                }
            });
        }

        // Clear merchant mappings
        merchantMappings.forEach((mapping) => {
            if (mapping.id) {
                deletePromises.push(deleteMerchantMapping(mapping.id));
            }
        });

        // Clear item name mappings
        itemNameMappings.forEach((mapping) => {
            if (mapping.id) {
                deletePromises.push(deleteItemNameMapping(mapping.id));
            }
        });

        // Clear trusted merchants
        trustedMerchants.forEach((merchant) => {
            deletePromises.push(removeTrust(merchant.merchantName));
        });

        await Promise.all(deletePromises);
    }, [
        categoriesContext,
        merchantMappings,
        itemNameMappings,
        trustedMerchants,
        deleteMerchantMapping,
        deleteItemNameMapping,
        removeTrust,
    ]);

    // === Compose Profile Data ===
    const profile = useMemo<ProfileData>(
        () => ({
            displayName: preferences.displayName || user?.displayName || '',
            email: user?.email || '',
            phoneNumber: preferences.phoneNumber || '',
            birthDate: preferences.birthDate || '',
            setDisplayName: (name: string) => setDisplayName(name),
            setPhoneNumber: (phone: string) => setPhoneNumber(phone),
            setBirthDate: (date: string) => setBirthDate(date),
        }),
        [
            preferences.displayName,
            preferences.phoneNumber,
            preferences.birthDate,
            user?.displayName,
            user?.email,
            setDisplayName,
            setPhoneNumber,
            setBirthDate,
        ]
    );

    // === Compose Preferences Data ===
    const preferencesData = useMemo<PreferencesData>(
        () => ({
            lang,
            currency,
            dateFormat,
            defaultCountry: preferences.defaultCountry || '',
            defaultCity: preferences.defaultCity || '',
            defaultScanCurrency: preferences.defaultCurrency || DEFAULT_CURRENCY,
            foreignLocationFormat: preferences.foreignLocationFormat || 'code',
            setLang: (l: Language) => setLang(l),
            setCurrency: (c: string) => setCurrency(c as typeof currency),
            setDateFormat: (f: 'LatAm' | 'US') => setDateFormat(f),
            setDefaultCountry: (country: string) => setDefaultCountry(country),
            setDefaultCity: (city: string) => setDefaultCity(city),
            setDefaultScanCurrency: (c: SupportedCurrency) => setDefaultCurrency(c),
            setForeignLocationFormat: (f: ForeignLocationDisplayFormat) =>
                setForeignLocationFormat(f),
        }),
        [
            lang,
            currency,
            dateFormat,
            preferences.defaultCountry,
            preferences.defaultCity,
            preferences.defaultCurrency,
            preferences.foreignLocationFormat,
            setLang,
            setCurrency,
            setDateFormat,
            setDefaultCountry,
            setDefaultCity,
            setDefaultCurrency,
            setForeignLocationFormat,
        ]
    );

    // === Compose Theme Data ===
    const themeData = useMemo<ThemeData>(
        () => ({
            theme,
            colorTheme,
            fontColorMode,
            fontFamily,
            fontSize,
            setTheme: (t: Theme) => setTheme(t),
            setColorTheme: (ct: ColorTheme) => setColorTheme(ct),
            setFontColorMode: (m: FontColorMode) => setFontColorMode(m),
            setFontFamily: (ff: FontFamily) => setFontFamily(ff),
            setFontSize: (fs: FontSize) => setFontSize(fs),
        }),
        [
            theme,
            colorTheme,
            fontColorMode,
            fontFamily,
            fontSize,
            setTheme,
            setColorTheme,
            setFontColorMode,
            setFontFamily,
            setFontSize,
        ]
    );

    // === Compose Subscription Data ===
    const subscriptionData = useMemo<SubscriptionData>(() => {
        // Calculate days until reset - default to end of current month
        // until subscription system provides actual reset dates
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysUntilReset = Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return {
            plan: 'freemium' as const, // Plan tracking not yet implemented
            creditsRemaining: credits.remaining,
            superCreditsRemaining: credits.superRemaining,
            daysUntilReset,
        };
    }, [credits.remaining, credits.superRemaining]);

    // === Compose Mappings Data ===
    const mappingsData = useMemo<MappingsData>(() => {
        // Category mapping wrapper to match signature
        const handleEditCategoryMapping = async (id: string, newCategory: string) => {
            if (categoriesContext?.updateCategoryMapping) {
                await categoriesContext.updateCategoryMapping(id, newCategory as StoreCategory);
            }
        };

        return {
            categories: {
                data: categoriesContext?.categoryMappings ?? [],
                loading: categoriesContext?.categoryLoading ?? false,
                delete: categoriesContext?.deleteCategoryMapping ?? (async () => {}),
                update: handleEditCategoryMapping,
            },
            subcategories: {
                data: categoriesContext?.subcategoryMappings ?? [],
                loading: categoriesContext?.subcategoryLoading ?? false,
                delete: categoriesContext?.deleteSubcategoryMapping ?? (async () => {}),
                update: categoriesContext?.updateSubcategoryMapping ?? (async () => {}),
            },
            merchants: {
                data: merchantMappings,
                loading: merchantMappingsLoading,
                delete: deleteMerchantMapping,
                update: updateMerchantMapping,
            },
            itemNames: {
                data: itemNameMappings,
                loading: itemNameMappingsLoading,
                delete: deleteItemNameMapping,
                update: updateItemNameMapping,
            },
            trusted: {
                data: trustedMerchants,
                loading: trustedMerchantsLoading,
                revoke: removeTrust,
            },
            clearAll: handleClearAllLearnedData,
        };
    }, [
        categoriesContext,
        merchantMappings,
        merchantMappingsLoading,
        deleteMerchantMapping,
        updateMerchantMapping,
        itemNameMappings,
        itemNameMappingsLoading,
        deleteItemNameMapping,
        updateItemNameMapping,
        trustedMerchants,
        trustedMerchantsLoading,
        removeTrust,
        handleClearAllLearnedData,
    ]);

    // === Compose Navigation Data ===
    const navigationData = useMemo<NavigationData>(
        () => ({
            subview: settingsSubview,
            setSubview: setSettingsSubview,
        }),
        [settingsSubview, setSettingsSubview]
    );

    // === Compose Account Actions ===
    const accountActions = useMemo<AccountActions>(
        () => ({
            signOut: handleSignOut,
            wipeDB: handleWipeDB,
            exportAll: handleExportAll,
            wiping,
            exporting,
        }),
        [handleSignOut, handleWipeDB, handleExportAll, wiping, exporting]
    );

    // === Return Complete Data ===
    return {
        profile,
        preferences: preferencesData,
        theme: themeData,
        subscription: subscriptionData,
        mappings: mappingsData,
        navigation: navigationData,
        account: accountActions,
        db,
        userId,
        appId,
        t,
    };
}

// =============================================================================
// Type Export for External Use
// =============================================================================

/**
 * Type alias for SettingsView data (for __testOverrides prop typing)
 */
export type SettingsViewData = UseSettingsViewDataReturn;
