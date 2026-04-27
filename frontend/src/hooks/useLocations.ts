/**
 * useLocations - React Query hooks for location data
 *
 * Story 14.35: Dynamic Location Data with Localization
 * Epic 14: Core Implementation
 *
 * Provides:
 * - useLocalizedCountries() - Fetch countries with translations
 * - useLocalizedCities(country) - Get cities for a country
 * - useLocationDisplay() - Helper functions for display
 *
 * Design:
 * - Countries are fetched once and cached (24hr TTL in localStorage)
 * - Cities use hardcoded data with Spanish translation lookup (no API)
 * - Initial render uses sync fallback data (no loading state)
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { LocalizedCountry, LocalizedCity, SupportedLanguage } from '../types/location';
import type { Language } from '../types/settings';
import {
    getLocalizedCountries,
    getLocalizedCountriesSync,
    getLocalizedCities,
    getCountryDisplayName,
    getCityDisplayName,
    getLocationDisplayString,
    sortCountriesByName,
    sortCitiesByName,
    mapStoredToDisplay,
    mapDisplayToStored,
} from '../services/locationService';
import { QUERY_KEYS } from '../lib/queryKeys';

// ============================================================================
// useLocalizedCountries Hook
// ============================================================================

interface UseLocalizedCountriesOptions {
    /** Language for sorting (default: 'en') */
    lang?: SupportedLanguage;
    /** Whether to fetch from API (default: true) */
    enabled?: boolean;
}

interface UseLocalizedCountriesResult {
    /** Localized countries sorted by name */
    countries: LocalizedCountry[];
    /** Whether data is being fetched from API */
    isLoading: boolean;
    /** Error if API fetch failed */
    error: Error | null;
    /** Refetch from API */
    refetch: () => void;
}

/**
 * Hook to get localized countries
 *
 * @param options - Configuration options
 * @returns Countries sorted by localized name
 *
 * @example
 * ```tsx
 * const { countries, isLoading } = useLocalizedCountries({ lang: 'es' });
 * // countries is immediately available (sync fallback)
 * // isLoading is true while API fetch is in progress
 * ```
 */
export function useLocalizedCountries(
    options: UseLocalizedCountriesOptions = {}
): UseLocalizedCountriesResult {
    const { lang = 'en', enabled = true } = options;

    // Sync initial data (immediate, no loading state)
    const initialData = useMemo(() => getLocalizedCountriesSync(), []);

    // React Query for API fetch
    const {
        data: apiData,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: QUERY_KEYS.locations.countries(),
        queryFn: () => getLocalizedCountries(false),
        enabled,
        // Countries rarely change - long stale time
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
        // Don't retry on failure - fallback data is fine
        retry: false,
        // Use sync data as placeholder
        placeholderData: initialData,
    });

    // Sort by localized name
    const countries = useMemo(() => {
        const data = apiData || initialData;
        return sortCountriesByName(data, lang);
    }, [apiData, initialData, lang]);

    return {
        countries,
        isLoading,
        error: error as Error | null,
        refetch: () => void refetch(),
    };
}

// ============================================================================
// useLocalizedCities Hook
// ============================================================================

interface UseLocalizedCitiesOptions {
    /** Language for sorting (default: 'en') */
    lang?: SupportedLanguage;
}

interface UseLocalizedCitiesResult {
    /** Localized cities sorted by name */
    cities: LocalizedCity[];
    /** Whether country is valid (has cities) */
    hasData: boolean;
}

/**
 * Hook to get localized cities for a country
 *
 * @param country - Country name (English) or ISO code
 * @param options - Configuration options
 * @returns Cities sorted by localized name
 *
 * @example
 * ```tsx
 * const { cities, hasData } = useLocalizedCities('Chile', { lang: 'es' });
 * ```
 */
export function useLocalizedCities(
    country: string,
    options: UseLocalizedCitiesOptions = {}
): UseLocalizedCitiesResult {
    const { lang = 'en' } = options;

    const cities = useMemo(() => {
        if (!country) return [];
        const rawCities = getLocalizedCities(country);
        return sortCitiesByName(rawCities, lang);
    }, [country, lang]);

    return {
        cities,
        hasData: cities.length > 0,
    };
}

// ============================================================================
// useLocationDisplay Hook
// ============================================================================

interface UseLocationDisplayResult {
    /** Get display name for a country */
    getCountryName: (countryNameOrCode: string) => string;
    /** Get display name for a city */
    getCityName: (cityName: string) => string;
    /** Get full location string "City, Country" */
    getLocationString: (city: string, country: string) => string;
    /** Map stored location (English) to display location */
    toDisplay: (stored: { country?: string; city?: string }) => {
        country: string;
        city: string;
    };
    /** Map display location to storage location (English) */
    toStorage: (display: { country?: string; city?: string }) => {
        country: string;
        city: string;
    };
}

/**
 * Hook providing location display utilities
 *
 * @param lang - Target language for display
 * @returns Utility functions for location display
 *
 * @example
 * ```tsx
 * const { getCountryName, getLocationString, toDisplay } = useLocationDisplay('es');
 *
 * // Convert stored English to Spanish display
 * const display = toDisplay({ country: 'Germany', city: 'Munich' });
 * // => { country: 'Alemania', city: 'Múnich' }
 *
 * // Get full string
 * const str = getLocationString('Munich', 'Germany');
 * // => "Múnich, Alemania"
 * ```
 */
export function useLocationDisplay(lang: Language): UseLocationDisplayResult {
    const getCountryName = useCallback(
        (countryNameOrCode: string) => getCountryDisplayName(countryNameOrCode, lang),
        [lang]
    );

    const getCityName = useCallback(
        (cityName: string) => getCityDisplayName(cityName, lang),
        [lang]
    );

    const getLocationString = useCallback(
        (city: string, country: string) => getLocationDisplayString(city, country, lang),
        [lang]
    );

    const toDisplay = useCallback(
        (stored: { country?: string; city?: string }) => mapStoredToDisplay(stored, lang),
        [lang]
    );

    const toStorage = useCallback(
        (display: { country?: string; city?: string }) => mapDisplayToStored(display),
        []
    );

    return {
        getCountryName,
        getCityName,
        getLocationString,
        toDisplay,
        toStorage,
    };
}

// ============================================================================
// Helper Types Export
// ============================================================================

export type { LocalizedCountry, LocalizedCity, SupportedLanguage };
