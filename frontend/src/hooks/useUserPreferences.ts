/**
 * useUserPreferences Hook
 *
 * Story 9.8: React hook for managing user preferences
 * Story 14.28: Migrated to React Query for app-level caching
 * Story 15-TD-9: Migrated to repository pattern (usePreferencesRepository)
 *
 * Provides access to user preferences with automatic loading, saving, and caching.
 * When called at App level, warms the React Query cache so subsequent Settings
 * visits show instantly (no loading spinner).
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import { useFirestoreQuery } from './useFirestoreQuery';
import { QUERY_KEYS } from '../lib/queryKeys';
import { usePreferencesRepository } from '@/repositories';
import type {
  UserPreferences,
  SupportedCurrency,
  SupportedFontFamily,
  ForeignLocationDisplayFormat,
} from '@/types/preferences';
import { DEFAULT_CURRENCY } from '@/utils/currency';

interface UseUserPreferencesResult {
  /** Current user preferences */
  preferences: UserPreferences;
  /** Loading state */
  loading: boolean;
  /** Update default currency */
  setDefaultCurrency: (currency: SupportedCurrency) => Promise<void>;
  /** Story 14.22: Update default country */
  setDefaultCountry: (country: string) => Promise<void>;
  /** Story 14.22: Update default city */
  setDefaultCity: (city: string) => Promise<void>;
  /** Story 14.22: Update display name */
  setDisplayName: (name: string) => Promise<void>;
  /** Story 14.22: Update phone number */
  setPhoneNumber: (phone: string) => Promise<void>;
  /** Story 14.22: Update birth date */
  setBirthDate: (date: string) => Promise<void>;
  /** Story 14.22: Update font family */
  setFontFamily: (fontFamily: SupportedFontFamily) => Promise<void>;
  /** Story 14.35b: Update foreign location display format */
  setForeignLocationFormat: (format: ForeignLocationDisplayFormat) => Promise<void>;
}

interface FirebaseServices {
  /** Retained for caller compatibility — no longer accessed directly (repository handles Firestore). */
  db: unknown;
  appId: string;
}

/** Default preferences used when no preferences exist */
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultCurrency: DEFAULT_CURRENCY as SupportedCurrency,
  defaultCountry: '',
  defaultCity: '',
  displayName: '',
  phoneNumber: '',
  birthDate: '',
  fontFamily: 'outfit',
  foreignLocationFormat: 'code',
};

/**
 * Hook for managing user preferences with React Query caching.
 *
 * Story 14.28: This hook now uses React Query for caching. When called
 * at the App level (on login), it warms the cache so that subsequent
 * Settings visits display instantly without a loading spinner.
 *
 * Story 15-TD-9: Uses usePreferencesRepository() for data access.
 * The user/services parameters are retained for backward compatibility
 * (they drive the enabled flag and query key).
 *
 * @param user - Firebase Auth user
 * @param services - Firebase services (db, appId)
 * @returns User preferences and update functions
 */
export function useUserPreferences(
  user: User | null,
  services: FirebaseServices | null
): UseUserPreferencesResult {
  const queryClient = useQueryClient();
  const prefsRepo = usePreferencesRepository();
  const enabled = !!user && !!services && !!prefsRepo;

  // Create stable query key
  const queryKey = useMemo(
    () => enabled
      ? QUERY_KEYS.userPreferences(user!.uid, services!.appId)
      : ['userPreferences', '', ''],
    [enabled, user?.uid, services?.appId]
  );

  // Use React Query for cached preferences fetch via repository
  const { data: preferences = DEFAULT_PREFERENCES, isLoading } = useFirestoreQuery(
    queryKey,
    () => prefsRepo!.get(),
    { enabled }
  );

  /**
   * Helper function for optimistic updates
   * Updates cache immediately, then persists to Firestore via repository
   * Reverts on error by refetching
   */
  const updatePreference = useCallback(
    async <K extends keyof Omit<UserPreferences, 'updatedAt'>>(
      key: K,
      value: UserPreferences[K]
    ) => {
      if (!prefsRepo) return;

      // Get current preferences from cache
      const currentPrefs = queryClient.getQueryData<UserPreferences>(queryKey) ?? DEFAULT_PREFERENCES;

      // Optimistic update - immediately update cache
      queryClient.setQueryData<UserPreferences>(queryKey, {
        ...currentPrefs,
        [key]: value,
      });

      try {
        // Persist to Firestore via repository
        await prefsRepo.save({ [key]: value });
      } catch (error) {
        console.error(`Failed to save ${key}:`, error);
        // Revert by refetching from Firestore
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [prefsRepo, queryClient, queryKey]
  );

  // Update functions using the helper
  const setDefaultCurrency = useCallback(
    (currency: SupportedCurrency) => updatePreference('defaultCurrency', currency),
    [updatePreference]
  );

  const setDefaultCountry = useCallback(
    (country: string) => updatePreference('defaultCountry', country),
    [updatePreference]
  );

  const setDefaultCity = useCallback(
    (city: string) => updatePreference('defaultCity', city),
    [updatePreference]
  );

  const setDisplayName = useCallback(
    (name: string) => updatePreference('displayName', name),
    [updatePreference]
  );

  const setPhoneNumber = useCallback(
    (phone: string) => updatePreference('phoneNumber', phone),
    [updatePreference]
  );

  const setBirthDate = useCallback(
    (date: string) => updatePreference('birthDate', date),
    [updatePreference]
  );

  const setFontFamily = useCallback(
    (fontFamily: SupportedFontFamily) => updatePreference('fontFamily', fontFamily),
    [updatePreference]
  );

  const setForeignLocationFormat = useCallback(
    (format: ForeignLocationDisplayFormat) => updatePreference('foreignLocationFormat', format),
    [updatePreference]
  );

  // Story 14c-refactor.13: saveViewModePreference REMOVED
  // View mode persistence removed - always defaults to personal mode

  return useMemo(
    () => ({
      preferences,
      loading: isLoading,
      setDefaultCurrency,
      setDefaultCountry,
      setDefaultCity,
      setDisplayName,
      setPhoneNumber,
      setBirthDate,
      setFontFamily,
      setForeignLocationFormat,
    }),
    [
      preferences,
      isLoading,
      setDefaultCurrency,
      setDefaultCountry,
      setDefaultCity,
      setDisplayName,
      setPhoneNumber,
      setBirthDate,
      setFontFamily,
      setForeignLocationFormat,
    ]
  );
}
