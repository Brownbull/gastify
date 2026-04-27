/**
 * useIsForeignLocation Hook
 *
 * Story 14.35b: Determines if a transaction's country differs from
 * the user's configured default country, enabling foreign location
 * indicators in the UI.
 */

import { useMemo } from 'react';
import { getCountryFlag, getCountryCode } from '../utils/countryFlags';

export interface ForeignLocationResult {
    /** True if the transaction country differs from user's default country */
    isForeign: boolean;
    /** Flag emoji for the transaction's country */
    flagEmoji: string;
    /** Story 14.35b: Two-letter ISO country code (e.g., 'US') */
    countryCode: string;
}

/**
 * Hook to detect if a location is "foreign" relative to user's default country.
 *
 * A location is considered foreign when:
 * 1. The user has a configured default country, AND
 * 2. The transaction has a country, AND
 * 3. The transaction country differs from the user's default country
 *
 * If the user has no configured country, all transactions are treated as local
 * (no flags shown), per AC 2: "Handle case where user has no country configured
 * (treat all as local)"
 *
 * @param transactionCountry - Country from the transaction (may be undefined)
 * @param userDefaultCountry - User's configured default country (may be empty)
 * @returns ForeignLocationResult with isForeign flag and emoji
 *
 * @example
 * // User in Chile, transaction from USA
 * const { isForeign, flagEmoji } = useIsForeignLocation('United States', 'Chile');
 * // isForeign: true, flagEmoji: '🇺🇸'
 *
 * @example
 * // User in Chile, transaction from Chile
 * const { isForeign, flagEmoji } = useIsForeignLocation('Chile', 'Chile');
 * // isForeign: false, flagEmoji: '🇨🇱'
 *
 * @example
 * // User has no default country configured
 * const { isForeign, flagEmoji } = useIsForeignLocation('United States', '');
 * // isForeign: false (treat all as local when no user country)
 */
export function useIsForeignLocation(
    transactionCountry: string | undefined | null,
    userDefaultCountry: string | undefined | null
): ForeignLocationResult {
    return useMemo(() => {
        // Get flag emoji for the transaction country (will be 🏳️ if not found)
        const flagEmoji = getCountryFlag(transactionCountry);
        // Story 14.35b: Get ISO country code (e.g., 'US')
        const countryCode = getCountryCode(transactionCountry);

        // If user has no configured country, treat all as local (AC 2)
        if (!userDefaultCountry || userDefaultCountry.trim() === '') {
            return { isForeign: false, flagEmoji, countryCode };
        }

        // If transaction has no country, it's not foreign
        if (!transactionCountry || transactionCountry.trim() === '') {
            return { isForeign: false, flagEmoji, countryCode };
        }

        // Compare countries (case-insensitive)
        const normalizedTransaction = transactionCountry.trim().toLowerCase();
        const normalizedUser = userDefaultCountry.trim().toLowerCase();

        const isForeign = normalizedTransaction !== normalizedUser;

        return { isForeign, flagEmoji, countryCode };
    }, [transactionCountry, userDefaultCountry]);
}
