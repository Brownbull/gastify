/**
 * Country Flag Utilities
 *
 * Story 14.35b: Provides country flag emoji lookup for displaying
 * foreign location indicators on transactions.
 *
 * Uses regional indicator symbols to generate flag emojis programmatically
 * from ISO 3166-1 alpha-2 country codes.
 */

/**
 * Map of country names to ISO 3166-1 alpha-2 codes.
 * Includes all countries from locations.ts data file.
 */
export const COUNTRY_TO_ISO: Record<string, string> = {
    // South America
    'Argentina': 'AR',
    'Bolivia': 'BO',
    'Brazil': 'BR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Ecuador': 'EC',
    'Guyana': 'GY',
    'Paraguay': 'PY',
    'Peru': 'PE',
    'Suriname': 'SR',
    'Uruguay': 'UY',
    'Venezuela': 'VE',

    // North America (including Central America and Caribbean)
    'Canada': 'CA',
    'Costa Rica': 'CR',
    'Cuba': 'CU',
    'Dominican Republic': 'DO',
    'El Salvador': 'SV',
    'Guatemala': 'GT',
    'Haiti': 'HT',
    'Honduras': 'HN',
    'Jamaica': 'JM',
    'Mexico': 'MX',
    'Nicaragua': 'NI',
    'Panama': 'PA',
    'Puerto Rico': 'PR',
    'United States': 'US',

    // Europe
    'Austria': 'AT',
    'Belgium': 'BE',
    'Croatia': 'HR',
    'Czech Republic': 'CZ',
    'Denmark': 'DK',
    'Finland': 'FI',
    'France': 'FR',
    'Germany': 'DE',
    'Greece': 'GR',
    'Hungary': 'HU',
    'Ireland': 'IE',
    'Italy': 'IT',
    'Netherlands': 'NL',
    'Norway': 'NO',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Romania': 'RO',
    'Spain': 'ES',
    'Sweden': 'SE',
    'Switzerland': 'CH',
    'United Kingdom': 'GB',

    // Asia
    'China': 'CN',
    'Hong Kong': 'HK',
    'India': 'IN',
    'Indonesia': 'ID',
    'Japan': 'JP',
    'Malaysia': 'MY',
    'Philippines': 'PH',
    'Singapore': 'SG',
    'South Korea': 'KR',
    'Taiwan': 'TW',
    'Thailand': 'TH',
    'Vietnam': 'VN',

    // Oceania
    'Australia': 'AU',
    'New Zealand': 'NZ',
};

/**
 * Reverse mapping: ISO code to country name.
 * Useful when input is an ISO code instead of a country name.
 */
export const ISO_TO_COUNTRY: Record<string, string> = Object.fromEntries(
    Object.entries(COUNTRY_TO_ISO).map(([country, iso]) => [iso, country])
);

/**
 * Converts an ISO 3166-1 alpha-2 country code to a flag emoji.
 *
 * Uses regional indicator symbol letters (U+1F1E6 to U+1F1FF) which
 * combine to form flag emojis when rendered together.
 *
 * @param isoCode - Two-letter ISO country code (e.g., 'US', 'CL')
 * @returns Flag emoji string (e.g., '🇺🇸', '🇨🇱')
 */
export function isoCodeToFlag(isoCode: string): string {
    const upperCode = isoCode.toUpperCase();
    if (upperCode.length !== 2) {
        return '🏳️'; // White flag fallback for invalid codes
    }

    // Regional indicator symbols start at U+1F1E6 (🇦)
    // Each letter is offset from 'A' (65)
    const REGIONAL_INDICATOR_BASE = 0x1F1E6;

    const firstChar = upperCode.charCodeAt(0) - 65; // 'A' = 0
    const secondChar = upperCode.charCodeAt(1) - 65;

    // Validate it's in A-Z range
    if (firstChar < 0 || firstChar > 25 || secondChar < 0 || secondChar > 25) {
        return '🏳️';
    }

    return String.fromCodePoint(
        REGIONAL_INDICATOR_BASE + firstChar,
        REGIONAL_INDICATOR_BASE + secondChar
    );
}

/**
 * Gets the flag emoji for a country, supporting both country names and ISO codes.
 *
 * @param countryNameOrCode - Country name (e.g., 'Chile') or ISO code (e.g., 'CL')
 * @returns Flag emoji string, or '🏳️' if country not recognized
 *
 * @example
 * getCountryFlag('Chile')        // '🇨🇱'
 * getCountryFlag('CL')           // '🇨🇱'
 * getCountryFlag('United States') // '🇺🇸'
 * getCountryFlag('US')           // '🇺🇸'
 * getCountryFlag('Unknown')      // '🏳️'
 */
export function getCountryFlag(countryNameOrCode: string | undefined | null): string {
    if (!countryNameOrCode) {
        return '🏳️';
    }

    const trimmed = countryNameOrCode.trim();

    // Try as country name first (most common case)
    const isoFromName = COUNTRY_TO_ISO[trimmed];
    if (isoFromName) {
        return isoCodeToFlag(isoFromName);
    }

    // Try as ISO code (2 letters uppercase)
    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed.length === 2 && ISO_TO_COUNTRY[upperTrimmed]) {
        return isoCodeToFlag(upperTrimmed);
    }

    // Case-insensitive country name lookup as fallback
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [country, iso] of Object.entries(COUNTRY_TO_ISO)) {
        if (country.toLowerCase() === lowerTrimmed) {
            return isoCodeToFlag(iso);
        }
    }

    // Not found - return white flag
    return '🏳️';
}

/**
 * Checks if a country is recognized (has a flag mapping).
 *
 * @param countryNameOrCode - Country name or ISO code
 * @returns true if the country is recognized
 */
export function isKnownCountry(countryNameOrCode: string | undefined | null): boolean {
    if (!countryNameOrCode) {
        return false;
    }

    const trimmed = countryNameOrCode.trim();

    // Check as country name
    if (COUNTRY_TO_ISO[trimmed]) {
        return true;
    }

    // Check as ISO code
    const upper = trimmed.toUpperCase();
    if (upper.length === 2 && ISO_TO_COUNTRY[upper]) {
        return true;
    }

    // Case-insensitive check
    const lower = trimmed.toLowerCase();
    return Object.keys(COUNTRY_TO_ISO).some(
        (country) => country.toLowerCase() === lower
    );
}

/**
 * Story 14.35b: Gets the ISO country code for a country.
 *
 * @param countryNameOrCode - Country name (e.g., 'Chile') or ISO code (e.g., 'CL')
 * @returns Two-letter ISO code (e.g., 'CL'), or empty string if not recognized
 *
 * @example
 * getCountryCode('Chile')         // 'CL'
 * getCountryCode('United States') // 'US'
 * getCountryCode('US')            // 'US'
 * getCountryCode('Unknown')       // ''
 */
export function getCountryCode(countryNameOrCode: string | undefined | null): string {
    if (!countryNameOrCode) {
        return '';
    }

    const trimmed = countryNameOrCode.trim();

    // Try as country name first (most common case)
    const isoFromName = COUNTRY_TO_ISO[trimmed];
    if (isoFromName) {
        return isoFromName;
    }

    // Try as ISO code (2 letters uppercase)
    const upperTrimmed = trimmed.toUpperCase();
    if (upperTrimmed.length === 2 && ISO_TO_COUNTRY[upperTrimmed]) {
        return upperTrimmed;
    }

    // Case-insensitive country name lookup as fallback
    const lowerTrimmed = trimmed.toLowerCase();
    for (const [country, iso] of Object.entries(COUNTRY_TO_ISO)) {
        if (country.toLowerCase() === lowerTrimmed) {
            return iso;
        }
    }

    // Not found
    return '';
}
