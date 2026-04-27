/**
 * ProcessScan Pure Utilities
 *
 * Pure utility functions extracted from App.tsx processScan handler.
 * These functions have no side effects and are easy to test.
 *
 * Story 14e-8a: Initial extraction of pure utilities
 *
 * @module features/scan/handlers/processScan/utils
 */

import type {
  ScanResult,
  LocationDefaults,
  BuildTransactionConfig,
  ParsedLocation,
  CityValidator,
  Transaction,
  TransactionItem,
  StoreCategory,
} from './types';

import { findCountry } from '@/services/locationService';

// Re-export getSafeDate from centralized validation utils
import { getSafeDate as getSafeDateImpl, parseStrictNumber as parseStrictNumberImpl } from '@/utils/validation';

export const getSafeDate = getSafeDateImpl;
export const parseStrictNumber = parseStrictNumberImpl;

/**
 * Validates and parses location (country/city) from scan result.
 *
 * Location validation rules:
 * 1. If both country and city are present, validate city against available cities list
 * 2. If no country from scan, use defaults
 * 3. If country matches but no city, use default city
 *
 * @param scanResult - Raw scan result from AI
 * @param defaults - User's default location preferences
 * @param getCitiesForCountry - Function to get valid cities for a country (dependency injection)
 * @returns Validated country and city
 *
 * @example
 * ```typescript
 * import { getCitiesForCountry } from '@/data/locations';
 *
 * const location = parseLocationResult(
 *   { country: 'Chile', city: 'santiago' },
 *   { defaultCountry: 'Chile', defaultCity: 'Santiago' },
 *   getCitiesForCountry
 * );
 * // Returns: { country: 'Chile', city: 'Santiago' } (properly cased)
 * ```
 */
export function parseLocationResult(
  scanResult: Pick<ScanResult, 'country' | 'city'>,
  defaults: LocationDefaults,
  getCitiesForCountry: CityValidator
): ParsedLocation {
  let finalCountry = scanResult.country || '';
  let finalCity = scanResult.city || '';

  // Story 14e-32 Bug Fix: Normalize country name to English
  // AI may return country in Spanish (e.g., "Estados Unidos" instead of "United States")
  // findCountry() handles matching Spanish/English/code and returns the normalized entry
  if (finalCountry) {
    const normalizedCountry = findCountry(finalCountry);
    if (normalizedCountry) {
      finalCountry = normalizedCountry.names.en;
    }
  }

  // Validate scanned city exists in our list for that country (case-insensitive match)
  if (finalCountry && finalCity) {
    const availableCities = getCitiesForCountry(finalCountry);
    const scannedCityLower = finalCity.toLowerCase();
    const matchedCity = availableCities.find(c => c.toLowerCase() === scannedCityLower);
    // Use the properly-cased version from our list, or clear if not found
    finalCity = matchedCity || '';
  }

  // If no location detected from scan, use defaults
  if (!finalCountry && defaults.defaultCountry) {
    finalCountry = defaults.defaultCountry;
    finalCity = defaults.defaultCity; // Use default city if no country was detected
  } else if (finalCountry && !finalCity && defaults.defaultCountry === finalCountry && defaults.defaultCity) {
    // Same country detected but no city, use default city
    finalCity = defaults.defaultCity;
  }

  return { country: finalCountry, city: finalCity };
}

/**
 * Normalizes scan result items to transaction items format.
 * Maps 'quantity' field from AI to 'qty' field, defaults to 1.
 * Coerces price fields via parseStrictNumber for safety.
 *
 * Note: processScan.ts does inline normalization + deriveItemsPrices for the
 * full pipeline. This function is kept as a tested, standalone utility.
 *
 * @param items - Raw items from scan result
 * @returns Normalized transaction items with qty field
 */
export function normalizeItems(
  items: ScanResult['items']
): TransactionItem[] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item): TransactionItem => ({
    name: item.name,
    totalPrice: parseStrictNumber(item.totalPrice),
    unitPrice: item.unitPrice != null ? parseStrictNumber(item.unitPrice) : undefined,
    qty: item.quantity ?? item.qty ?? 1,
    category: item.category,
    subcategory: item.subcategory,
  }));
}

/**
 * Validates and clamps date to not exceed current year.
 * Uses getSafeDate for initial parsing, then validates year.
 *
 * @param dateString - Date string from scan result
 * @returns Valid date string in YYYY-MM-DD format
 */
export function validateScanDate(dateString: string | undefined): string {
  // Use the already imported getSafeDate
  let date = getSafeDateImpl(dateString);

  // Clamp future years to current date
  if (new Date(date).getFullYear() > new Date().getFullYear()) {
    date = new Date().toISOString().split('T')[0];
  }

  return date;
}

/**
 * Builds an initial transaction object from scan result data.
 * This is a pure function - all context is passed as parameters.
 *
 * @param scanResult - Raw scan result from AI
 * @param parsedItems - Items already processed through normalizeItems
 * @param location - Validated location from parseLocationResult
 * @param total - Validated total (already parsed through parseStrictNumber)
 * @param date - Validated date (already processed through validateScanDate)
 * @param config - Build configuration (language)
 * @returns Initial transaction object ready for further processing
 *
 * @example
 * ```typescript
 * const transaction = buildInitialTransaction(
 *   scanResult,
 *   normalizedItems,
 *   { country: 'Chile', city: 'Santiago' },
 *   15000,
 *   '2026-01-25',
 *   { language: 'es' }
 * );
 * ```
 */
export function buildInitialTransaction(
  scanResult: ScanResult,
  parsedItems: TransactionItem[],
  location: ParsedLocation,
  total: number,
  date: string,
  _config: BuildTransactionConfig
): Transaction {
  const merchant = scanResult.merchant || 'Unknown';
  const category = (scanResult.category || 'Other') as StoreCategory;

  const transaction: Transaction = {
    merchant,
    date,
    total,
    category,
    alias: merchant,
    items: parsedItems,
    // Include image URLs from Cloud Function response
    imageUrls: scanResult.imageUrls,
    thumbnailUrl: scanResult.thumbnailUrl,
    time: scanResult.time,
    country: location.country,
    city: location.city,
    currency: scanResult.currency,
    receiptType: scanResult.receiptType,
    promptVersion: scanResult.promptVersion,
    merchantSource: scanResult.merchantSource,
  };


  return transaction;
}

/**
 * Checks if scan result has a valid total (non-zero number).
 *
 * @param total - Total value from scan result
 * @returns True if total is valid
 */
export function hasValidTotal(total: number | undefined): boolean {
  return typeof total === 'number' && total > 0;
}

/**
 * Checks if scan result has items.
 *
 * @param items - Items array from scan result
 * @returns True if items exist and have length > 0
 */
export function hasItems(items: ScanResult['items']): boolean {
  return Array.isArray(items) && items.length > 0;
}
