/**
 * Localized Location Types
 *
 * Story 14.35: Dynamic Location Data with Localization
 * Epic 14: Core Implementation
 *
 * Provides types for localized country and city data with
 * support for multiple languages (English and Spanish).
 */

import type { Language } from './settings';

/**
 * Localized name structure supporting multiple languages
 */
export interface LocalizedNames {
    /** English name (primary key for storage) */
    en: string;
    /** Spanish name */
    es: string;
    /** Native script (optional, e.g., "日本" for Japan) */
    native?: string;
}

/**
 * Country with localized names
 */
export interface LocalizedCountry {
    /** ISO 3166-1 alpha-2 code (e.g., "CL", "US") */
    code: string;
    /** Localized names */
    names: LocalizedNames;
}

/**
 * City with localized names
 */
export interface LocalizedCity {
    /** City name in English (used as storage key) */
    id: string;
    /** ISO country code */
    countryCode: string;
    /** Localized names */
    names: LocalizedNames;
    /** Population (optional, for sorting by importance) */
    population?: number;
}

/**
 * Cache structure for localStorage
 */
export interface LocationCache {
    /** Schema version for migration */
    version: string;
    /** Last fetch timestamp (ms) */
    timestamp: number;
    /** Time-to-live in milliseconds (24 hours default) */
    ttl: number;
    /** Cached countries with translations */
    countries: LocalizedCountry[];
}

/**
 * REST Countries API response shape (partial)
 */
export interface RESTCountryResponse {
    name: {
        common: string;
        official: string;
        nativeName?: Record<string, { common: string; official: string }>;
    };
    cca2: string;
    translations: {
        spa?: { common: string; official: string };
        [key: string]: { common: string; official: string } | undefined;
    };
}

/**
 * Helper type for language-aware display functions
 */
export type SupportedLanguage = Language;

/**
 * Location service configuration
 */
export interface LocationServiceConfig {
    /** REST Countries API endpoint */
    countriesApiUrl: string;
    /** Cache TTL in milliseconds */
    cacheTtlMs: number;
    /** localStorage key for cache */
    cacheKey: string;
    /** Cache version for migrations */
    cacheVersion: string;
}
