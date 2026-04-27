/**
 * User Preferences Types
 *
 * Story 15b-3b: Extracted from userPreferencesService.ts to provide
 * a canonical shared location for preference types.
 */

import type { FieldValue, Timestamp } from 'firebase/firestore';

/**
 * Supported currencies for the application
 * Matches SUPPORTED_CURRENCIES from functions/src/prompts/input-hints.ts
 */
export type SupportedCurrency = 'CLP' | 'USD' | 'EUR';

/**
 * Supported font families for the application
 * Story 14.22: Typography selection - persisted to Firestore
 */
export type SupportedFontFamily = 'outfit' | 'space';

/**
 * Foreign location display format preference
 * Story 14.35b: How to display foreign country indicators
 * - 'code': Two-letter country code (e.g., "US Orlando")
 * - 'flag': Flag emoji (e.g., "🇺🇸 Orlando")
 */
export type ForeignLocationDisplayFormat = 'code' | 'flag';

/**
 * User preferences stored in Firestore
 * Story 14.22: Extended to include location settings for cloud persistence
 */
export interface UserPreferences {
  /** Default currency for receipt scanning */
  defaultCurrency: SupportedCurrency;
  /** Default country for scan location (Story 14.22) */
  defaultCountry?: string;
  /** Default city for scan location (Story 14.22) */
  defaultCity?: string;
  /** User display name (Story 14.22: Profile sub-view) */
  displayName?: string;
  /** User phone number (Story 14.22: Profile sub-view) */
  phoneNumber?: string;
  /** User birth date (Story 14.22: Profile sub-view) */
  birthDate?: string;
  /** Font family preference (Story 14.22: Typography selection) */
  fontFamily?: SupportedFontFamily;
  /** Story 14.35b: Foreign location display format ('code' or 'flag') */
  foreignLocationFormat?: ForeignLocationDisplayFormat;
  /** Timestamp when preferences were last updated */
  updatedAt?: FieldValue | Timestamp;
}
