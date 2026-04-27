/**
 * User Preferences Service
 * Story 9.8: Handles user preferences storage in Firestore
 *
 * Firestore path: artifacts/{appId}/users/{userId}/preferences/settings
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { sanitizeInput, sanitizeLocation } from '@/utils/sanitize';
import { preferencesDocSegments } from '@/lib/firestorePaths';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// Story 15b-3b: Types and constants extracted to shared locations.
// Re-export for backward compatibility (tests + functions import from this file).
export type { SupportedCurrency, SupportedFontFamily, ForeignLocationDisplayFormat, UserPreferences } from '@/types/preferences';
export { CURRENCY_INFO, SUPPORTED_CURRENCIES } from '@/utils/currency';

// Import types for local use in this file
import type { SupportedCurrency, UserPreferences } from '@/types/preferences';

/**
 * Default preferences for new users
 * Story 14.22: Added fontFamily default to 'outfit'
 * Story 14.35b: Added foreignLocationFormat default to 'code'
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: DEFAULT_CURRENCY as SupportedCurrency,
  fontFamily: 'outfit',
  foreignLocationFormat: 'code',
};

/**
 * Get the Firestore document reference for user preferences
 */
function getPreferencesDocRef(db: Firestore, appId: string, userId: string) {
  return doc(db, ...preferencesDocSegments(appId, userId));
}

/**
 * Get user preferences from Firestore
 *
 * @param db - Firestore instance
 * @param userId - User ID from Firebase Auth
 * @param appId - Application ID
 * @returns User preferences or default values if not found
 */
export async function getUserPreferences(
  db: Firestore,
  userId: string,
  appId: string
): Promise<UserPreferences> {
  try {
    const docRef = getPreferencesDocRef(db, appId, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        defaultCurrency: data.defaultCurrency || DEFAULT_PREFERENCES.defaultCurrency,
        // Story 14.22: Include location and profile fields
        defaultCountry: data.defaultCountry || '',
        defaultCity: data.defaultCity || '',
        displayName: data.displayName || '',
        phoneNumber: data.phoneNumber || '',
        birthDate: data.birthDate || '',
        // Story 14.22: Font family preference (defaults to 'outfit')
        fontFamily: data.fontFamily || DEFAULT_PREFERENCES.fontFamily,
        // Story 14.35b: Foreign location display format (defaults to 'code')
        foreignLocationFormat: data.foreignLocationFormat || DEFAULT_PREFERENCES.foreignLocationFormat,
        updatedAt: data.updatedAt,
      };
    }

    // Return defaults if no preferences exist
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    // Return defaults on error
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save user preferences to Firestore
 *
 * @param db - Firestore instance
 * @param userId - User ID from Firebase Auth
 * @param appId - Application ID
 * @param preferences - Partial preferences to save (merged with existing)
 */
export async function saveUserPreferences(
  db: Firestore,
  userId: string,
  appId: string,
  preferences: Partial<Omit<UserPreferences, 'updatedAt'>>
): Promise<void> {
  try {
    const docRef = getPreferencesDocRef(db, appId, userId);

    const sanitized = {
      ...preferences,
      ...(preferences.displayName !== undefined && {
        displayName: sanitizeInput(preferences.displayName, { maxLength: 100 }),
      }),
      ...(preferences.phoneNumber !== undefined && {
        phoneNumber: sanitizeInput(preferences.phoneNumber, { maxLength: 20 }),
      }),
      ...(preferences.birthDate !== undefined && {
        birthDate: sanitizeInput(preferences.birthDate, { maxLength: 10 }),
      }),
      ...(preferences.defaultCountry !== undefined && {
        defaultCountry: sanitizeLocation(preferences.defaultCountry),
      }),
      ...(preferences.defaultCity !== undefined && {
        defaultCity: sanitizeLocation(preferences.defaultCity),
      }),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
}

