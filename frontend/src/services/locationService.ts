/**
 * Location Service - Dynamic Location Data with Localization
 *
 * Story 14.35: Dynamic Location Data with Localization
 * Epic 14: Core Implementation
 *
 * Provides:
 * - Countries from REST Countries API with Spanish translations
 * - Cities from hardcoded data with Spanish translation lookup
 * - 24-hour cache for API data
 * - Graceful fallback to hardcoded data on API failure
 *
 * Design Decisions:
 * - REST Countries API for countries (free, unlimited, excellent translations)
 * - Hardcoded cities remain primary source (well-curated for app's use case)
 * - Spanish city name translations via lookup table for major cities
 * - Transactions store English names for backward compatibility
 */

import type {
    LocalizedCountry,
    LocalizedCity,
    LocalizedNames,
    LocationCache,
    RESTCountryResponse,
    LocationServiceConfig,
    SupportedLanguage,
} from '../types/location';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../data/locations';
import { getStorageJSON, setStorageJSON } from '@/utils/storage';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: LocationServiceConfig = {
    countriesApiUrl: 'https://restcountries.com/v3.1/all?fields=name,cca2,translations',
    cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours
    cacheKey: 'gastify_location_cache',
    cacheVersion: '1.0',
};

// ============================================================================
// Spanish City Translations
// ============================================================================

/**
 * Spanish translations for major cities
 * Key: English city name, Value: Spanish city name
 * Only cities that differ significantly from English are included
 */
const CITY_SPANISH_TRANSLATIONS: Record<string, string> = {
    // USA
    'New York': 'Nueva York',
    'Los Angeles': 'Los Ángeles',
    'San Francisco': 'San Francisco',
    'Philadelphia': 'Filadelfia',
    'Washington D.C.': 'Washington D.C.',
    'Chicago': 'Chicago',
    'Houston': 'Houston',
    'Phoenix': 'Phoenix',
    'San Antonio': 'San Antonio',
    'San Diego': 'San Diego',
    'Dallas': 'Dallas',
    'San Jose': 'San José',
    'Austin': 'Austin',
    'Seattle': 'Seattle',
    'Denver': 'Denver',
    'Boston': 'Boston',
    'Miami': 'Miami',
    'Atlanta': 'Atlanta',
    'Las Vegas': 'Las Vegas',
    'Portland': 'Portland',

    // UK
    'London': 'Londres',
    'Edinburgh': 'Edimburgo',
    'Birmingham': 'Birmingham',
    'Manchester': 'Mánchester',
    'Glasgow': 'Glasgow',
    'Liverpool': 'Liverpool',
    'Leeds': 'Leeds',
    'Sheffield': 'Sheffield',
    'Bristol': 'Bristol',
    'Cardiff': 'Cardiff',

    // France
    'Paris': 'París',
    'Marseille': 'Marsella',
    'Lyon': 'Lyon',
    'Toulouse': 'Toulouse',
    'Nice': 'Niza',
    'Nantes': 'Nantes',
    'Strasbourg': 'Estrasburgo',
    'Montpellier': 'Montpellier',
    'Bordeaux': 'Burdeos',
    'Lille': 'Lille',

    // Italy
    'Rome': 'Roma',
    'Milan': 'Milán',
    'Naples': 'Nápoles',
    'Turin': 'Turín',
    'Palermo': 'Palermo',
    'Genoa': 'Génova',
    'Bologna': 'Bolonia',
    'Florence': 'Florencia',
    'Venice': 'Venecia',
    'Verona': 'Verona',

    // Germany
    'Berlin': 'Berlín',
    'Hamburg': 'Hamburgo',
    'Munich': 'Múnich',
    'Cologne': 'Colonia',
    'Frankfurt': 'Fráncfort',
    'Stuttgart': 'Stuttgart',
    'Düsseldorf': 'Düsseldorf',
    'Leipzig': 'Leipzig',
    'Dortmund': 'Dortmund',
    'Dresden': 'Dresde',

    // Spain (already in Spanish, but some have accents)
    'Madrid': 'Madrid',
    'Barcelona': 'Barcelona',
    'Valencia': 'Valencia',
    'Seville': 'Sevilla',
    'Zaragoza': 'Zaragoza',
    'Málaga': 'Málaga',
    'Murcia': 'Murcia',
    'Palma': 'Palma',
    'Bilbao': 'Bilbao',
    'Granada': 'Granada',

    // Other Europe
    'Vienna': 'Viena',
    'Prague': 'Praga',
    'Warsaw': 'Varsovia',
    'Budapest': 'Budapest',
    'Athens': 'Atenas',
    'Lisbon': 'Lisboa',
    'Porto': 'Oporto',
    'Brussels': 'Bruselas',
    'Antwerp': 'Amberes',
    'Ghent': 'Gante',
    'Bruges': 'Brujas',
    'Amsterdam': 'Ámsterdam',
    'Rotterdam': 'Róterdam',
    'The Hague': 'La Haya',
    'Utrecht': 'Utrecht',
    'Copenhagen': 'Copenhague',
    'Stockholm': 'Estocolmo',
    'Oslo': 'Oslo',
    'Helsinki': 'Helsinki',
    'Zurich': 'Zúrich',
    'Geneva': 'Ginebra',
    'Bern': 'Berna',
    'Basel': 'Basilea',
    'Lausanne': 'Lausana',
    'Lucerne': 'Lucerna',
    'Moscow': 'Moscú',
    'Zagreb': 'Zagreb',
    'Split': 'Split',
    'Dubrovnik': 'Dubrovnik',
    'Bucharest': 'Bucarest',

    // Asia
    'Beijing': 'Pekín',
    'Shanghai': 'Shanghái',
    'Guangzhou': 'Cantón',
    'Shenzhen': 'Shenzhen',
    'Hong Kong': 'Hong Kong',
    'Tokyo': 'Tokio',
    'Osaka': 'Osaka',
    'Yokohama': 'Yokohama',
    'Nagoya': 'Nagoya',
    'Kyoto': 'Kioto',
    'Seoul': 'Seúl',
    'Busan': 'Busán',
    'Bangkok': 'Bangkok',
    'Singapore': 'Singapur',
    'Kuala Lumpur': 'Kuala Lumpur',
    'Jakarta': 'Yakarta',
    'Manila': 'Manila',
    'Ho Chi Minh City': 'Ciudad Ho Chi Minh',
    'Hanoi': 'Hanói',
    'Mumbai': 'Bombay',
    'New Delhi': 'Nueva Delhi',
    'Delhi': 'Delhi',
    'Bangalore': 'Bangalore',
    'Taipei': 'Taipéi',

    // Oceania
    'Sydney': 'Sídney',
    'Melbourne': 'Melbourne',
    'Brisbane': 'Brisbane',
    'Perth': 'Perth',
    'Adelaide': 'Adelaida',
    'Auckland': 'Auckland',
    'Wellington': 'Wellington',
    'Christchurch': 'Christchurch',

    // Canada
    'Toronto': 'Toronto',
    'Montreal': 'Montreal',
    'Vancouver': 'Vancouver',
    'Calgary': 'Calgary',
    'Edmonton': 'Edmonton',
    'Ottawa': 'Ottawa',
    'Quebec City': 'Quebec',

    // Mexico
    'Mexico City': 'Ciudad de México',
    'Guadalajara': 'Guadalajara',
    'Monterrey': 'Monterrey',
    'Puebla': 'Puebla',
    'Tijuana': 'Tijuana',
    'Cancún': 'Cancún',
    'Mérida': 'Mérida',
    'Oaxaca': 'Oaxaca',

    // Central America & Caribbean
    'Havana': 'La Habana',
    'San José': 'San José',
    'Panama City': 'Ciudad de Panamá',
    'Guatemala City': 'Ciudad de Guatemala',
    'San Salvador': 'San Salvador',
    'Tegucigalpa': 'Tegucigalpa',
    'Managua': 'Managua',
    'Santo Domingo': 'Santo Domingo',
    'San Juan': 'San Juan',
    'Kingston': 'Kingston',

    // South America
    'Buenos Aires': 'Buenos Aires',
    'São Paulo': 'São Paulo',
    'Rio de Janeiro': 'Río de Janeiro',
    'Bogotá': 'Bogotá',
    'Lima': 'Lima',
    'Caracas': 'Caracas',
    'Quito': 'Quito',
    'Montevideo': 'Montevideo',
    'Asunción': 'Asunción',
    'La Paz': 'La Paz',

    // Middle East
    'Cairo': 'El Cairo',
    'Jerusalem': 'Jerusalén',
    'Tel Aviv': 'Tel Aviv',
};

/**
 * Spanish translations for country names
 * Fallback if API is unavailable
 */
const COUNTRY_SPANISH_FALLBACK: Record<string, string> = {
    'Argentina': 'Argentina',
    'Australia': 'Australia',
    'Austria': 'Austria',
    'Belgium': 'Bélgica',
    'Bolivia': 'Bolivia',
    'Brazil': 'Brasil',
    'Canada': 'Canadá',
    'Chile': 'Chile',
    'China': 'China',
    'Colombia': 'Colombia',
    'Costa Rica': 'Costa Rica',
    'Croatia': 'Croacia',
    'Cuba': 'Cuba',
    'Czech Republic': 'República Checa',
    'Denmark': 'Dinamarca',
    'Dominican Republic': 'República Dominicana',
    'Ecuador': 'Ecuador',
    'El Salvador': 'El Salvador',
    'Finland': 'Finlandia',
    'France': 'Francia',
    'Germany': 'Alemania',
    'Greece': 'Grecia',
    'Guatemala': 'Guatemala',
    'Guyana': 'Guyana',
    'Haiti': 'Haití',
    'Honduras': 'Honduras',
    'Hong Kong': 'Hong Kong',
    'Hungary': 'Hungría',
    'India': 'India',
    'Indonesia': 'Indonesia',
    'Ireland': 'Irlanda',
    'Italy': 'Italia',
    'Jamaica': 'Jamaica',
    'Japan': 'Japón',
    'Malaysia': 'Malasia',
    'Mexico': 'México',
    'Netherlands': 'Países Bajos',
    'New Zealand': 'Nueva Zelanda',
    'Nicaragua': 'Nicaragua',
    'Norway': 'Noruega',
    'Panama': 'Panamá',
    'Paraguay': 'Paraguay',
    'Peru': 'Perú',
    'Philippines': 'Filipinas',
    'Poland': 'Polonia',
    'Portugal': 'Portugal',
    'Puerto Rico': 'Puerto Rico',
    'Romania': 'Rumanía',
    'Singapore': 'Singapur',
    'South Korea': 'Corea del Sur',
    'Spain': 'España',
    'Suriname': 'Surinam',
    'Sweden': 'Suecia',
    'Switzerland': 'Suiza',
    'Taiwan': 'Taiwán',
    'Thailand': 'Tailandia',
    'United Kingdom': 'Reino Unido',
    'United States': 'Estados Unidos',
    'Uruguay': 'Uruguay',
    'Venezuela': 'Venezuela',
    'Vietnam': 'Vietnam',
};

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Check if cache is valid (exists and not expired)
 */
function isCacheValid(cache: LocationCache | null): cache is LocationCache {
    if (!cache) return false;
    if (cache.version !== DEFAULT_CONFIG.cacheVersion) return false;
    return Date.now() - cache.timestamp < cache.ttl;
}

/**
 * Load cache from localStorage
 */
function loadCache(): LocationCache | null {
    return getStorageJSON<LocationCache | null>(DEFAULT_CONFIG.cacheKey, null);
}

function saveCache(countries: LocalizedCountry[]): void {
    const cache: LocationCache = {
        version: DEFAULT_CONFIG.cacheVersion,
        timestamp: Date.now(),
        ttl: DEFAULT_CONFIG.cacheTtlMs,
        countries,
    };
    setStorageJSON(DEFAULT_CONFIG.cacheKey, cache);
}

// ============================================================================
// API Integration
// ============================================================================

/**
 * Fetch countries from REST Countries API
 * Returns null on failure (caller should use fallback)
 */
async function fetchCountriesFromApi(): Promise<LocalizedCountry[] | null> {
    try {
        const response = await fetch(DEFAULT_CONFIG.countriesApiUrl);
        if (!response.ok) {
            console.warn(`[LocationService] API returned ${response.status}`);
            return null;
        }

        const data: RESTCountryResponse[] = await response.json();

        // Transform to LocalizedCountry format
        const countries: LocalizedCountry[] = data.map((country) => ({
            code: country.cca2,
            names: {
                en: country.name.common,
                es: country.translations.spa?.common || country.name.common,
                native: getFirstNativeName(country.name.nativeName),
            },
        }));

        return countries;
    } catch (error) {
        console.warn('[LocationService] Failed to fetch countries from API:', error);
        return null;
    }
}

/**
 * Extract first native name from nativeName object
 */
function getFirstNativeName(
    nativeName?: Record<string, { common: string; official: string }>
): string | undefined {
    if (!nativeName) return undefined;
    const firstKey = Object.keys(nativeName)[0];
    if (!firstKey) return undefined;
    return nativeName[firstKey]?.common;
}

// ============================================================================
// Fallback Data Generation
// ============================================================================

/**
 * Generate LocalizedCountry array from hardcoded COUNTRIES
 */
function generateFallbackCountries(): LocalizedCountry[] {
    return COUNTRIES.map((country) => ({
        code: getCountryCode(country),
        names: {
            en: country,
            es: COUNTRY_SPANISH_FALLBACK[country] || country,
        },
    }));
}

/**
 * Get ISO country code from country name
 * Simple lookup for our supported countries
 */
function getCountryCode(countryName: string): string {
    const codes: Record<string, string> = {
        'Argentina': 'AR', 'Australia': 'AU', 'Austria': 'AT', 'Belgium': 'BE',
        'Bolivia': 'BO', 'Brazil': 'BR', 'Canada': 'CA', 'Chile': 'CL',
        'China': 'CN', 'Colombia': 'CO', 'Costa Rica': 'CR', 'Croatia': 'HR',
        'Cuba': 'CU', 'Czech Republic': 'CZ', 'Denmark': 'DK',
        'Dominican Republic': 'DO', 'Ecuador': 'EC', 'El Salvador': 'SV',
        'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'GR',
        'Guatemala': 'GT', 'Guyana': 'GY', 'Haiti': 'HT', 'Honduras': 'HN',
        'Hong Kong': 'HK', 'Hungary': 'HU', 'India': 'IN', 'Indonesia': 'ID',
        'Ireland': 'IE', 'Italy': 'IT', 'Jamaica': 'JM', 'Japan': 'JP',
        'Malaysia': 'MY', 'Mexico': 'MX', 'Netherlands': 'NL',
        'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Norway': 'NO', 'Panama': 'PA',
        'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL',
        'Portugal': 'PT', 'Puerto Rico': 'PR', 'Romania': 'RO',
        'Singapore': 'SG', 'South Korea': 'KR', 'Spain': 'ES', 'Suriname': 'SR',
        'Sweden': 'SE', 'Switzerland': 'CH', 'Taiwan': 'TW', 'Thailand': 'TH',
        'United Kingdom': 'GB', 'United States': 'US', 'Uruguay': 'UY',
        'Venezuela': 'VE', 'Vietnam': 'VN',
    };
    return codes[countryName] || countryName.substring(0, 2).toUpperCase();
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Cached countries - populated on first call to getLocalizedCountries()
 */
let cachedCountries: LocalizedCountry[] | null = null;

/**
 * Get localized countries
 * Uses cache if valid, fetches from API otherwise, falls back to hardcoded data
 *
 * @param forceRefresh - If true, ignores cache and fetches from API
 * @returns Promise<LocalizedCountry[]>
 */
export async function getLocalizedCountries(
    forceRefresh = false
): Promise<LocalizedCountry[]> {
    // Return memory cache if available and not forcing refresh
    if (cachedCountries && !forceRefresh) {
        return cachedCountries;
    }

    // Check localStorage cache
    if (!forceRefresh) {
        const cache = loadCache();
        if (isCacheValid(cache)) {
            cachedCountries = cache.countries;
            return cachedCountries;
        }
    }

    // Fetch from API
    const apiCountries = await fetchCountriesFromApi();
    if (apiCountries) {
        // Filter to only countries we support (from hardcoded list)
        const supportedCodes = new Set(COUNTRIES.map(getCountryCode));
        const filtered = apiCountries.filter((c) => supportedCodes.has(c.code));

        // Save to cache
        saveCache(filtered);
        cachedCountries = filtered;
        return cachedCountries;
    }

    // Fallback to hardcoded data with Spanish translations
    console.info('[LocationService] Using fallback country data');
    cachedCountries = generateFallbackCountries();
    return cachedCountries;
}

/**
 * Get localized countries synchronously
 * Uses memory/localStorage cache, returns fallback if not available
 * Useful for initial render before async data is ready
 */
export function getLocalizedCountriesSync(): LocalizedCountry[] {
    // Memory cache first
    if (cachedCountries) {
        return cachedCountries;
    }

    // localStorage cache
    const cache = loadCache();
    if (isCacheValid(cache)) {
        cachedCountries = cache.countries;
        return cachedCountries;
    }

    // Fallback
    return generateFallbackCountries();
}

/**
 * Get localized cities for a country
 *
 * @param countryNameOrCode - Country name (English) or ISO code
 * @returns LocalizedCity[]
 */
export function getLocalizedCities(
    countryNameOrCode: string
): LocalizedCity[] {
    // Find country by name or code
    const countries = getLocalizedCountriesSync();
    const country = countries.find(
        (c) =>
            c.names.en === countryNameOrCode ||
            c.code === countryNameOrCode ||
            c.names.es === countryNameOrCode
    );

    // Use English name to lookup cities
    const countryNameEn = country?.names.en || countryNameOrCode;
    const cities = CITIES_BY_COUNTRY[countryNameEn] || [];

    // Transform to LocalizedCity format
    return cities.map((cityName) => ({
        id: cityName,
        countryCode: country?.code || '',
        names: {
            en: cityName,
            es: CITY_SPANISH_TRANSLATIONS[cityName] || cityName,
        },
    }));
}

/**
 * Get display name for a country in the specified language
 *
 * @param countryNameOrCode - Country name (English) or ISO code or Spanish name
 * @param lang - Target language
 * @returns Localized country name
 */
export function getCountryDisplayName(
    countryNameOrCode: string,
    lang: SupportedLanguage
): string {
    if (!countryNameOrCode) return '';

    const countries = getLocalizedCountriesSync();
    const country = countries.find(
        (c) =>
            c.names.en === countryNameOrCode ||
            c.code === countryNameOrCode ||
            c.names.es === countryNameOrCode
    );

    if (!country) {
        // Not found in our list - return as-is
        return countryNameOrCode;
    }

    return country.names[lang] || country.names.en;
}

/**
 * Get display name for a city in the specified language
 *
 * @param cityName - City name (usually English from stored transaction)
 * @param lang - Target language
 * @returns Localized city name
 */
export function getCityDisplayName(
    cityName: string,
    lang: SupportedLanguage
): string {
    if (!cityName) return '';

    if (lang === 'es') {
        return CITY_SPANISH_TRANSLATIONS[cityName] || cityName;
    }

    return cityName;
}

/**
 * Get full location display string
 *
 * @param city - City name (English storage key)
 * @param country - Country name (English storage key)
 * @param lang - Target language
 * @returns "City, Country" in target language
 */
export function getLocationDisplayString(
    city: string,
    country: string,
    lang: SupportedLanguage
): string {
    const cityDisplay = getCityDisplayName(city, lang);
    const countryDisplay = getCountryDisplayName(country, lang);

    if (cityDisplay && countryDisplay) {
        return `${cityDisplay}, ${countryDisplay}`;
    }
    return cityDisplay || countryDisplay || '';
}

/**
 * Sort countries by localized name
 *
 * @param countries - Countries to sort
 * @param lang - Language for sorting
 * @returns Sorted array (new array, original unchanged)
 */
export function sortCountriesByName(
    countries: LocalizedCountry[],
    lang: SupportedLanguage
): LocalizedCountry[] {
    return [...countries].sort((a, b) =>
        a.names[lang].localeCompare(b.names[lang], lang)
    );
}

/**
 * Sort cities by localized name
 *
 * @param cities - Cities to sort
 * @param lang - Language for sorting
 * @returns Sorted array (new array, original unchanged)
 */
export function sortCitiesByName(
    cities: LocalizedCity[],
    lang: SupportedLanguage
): LocalizedCity[] {
    return [...cities].sort((a, b) =>
        a.names[lang].localeCompare(b.names[lang], lang)
    );
}

/**
 * Find country by any name (English, Spanish, or code)
 * Useful for backward compatibility with stored English names
 *
 * @param nameOrCode - Country name in any language or ISO code
 * @returns LocalizedCountry or undefined
 */
export function findCountry(nameOrCode: string): LocalizedCountry | undefined {
    if (!nameOrCode) return undefined;

    const countries = getLocalizedCountriesSync();
    return countries.find(
        (c) =>
            c.names.en === nameOrCode ||
            c.names.es === nameOrCode ||
            c.code === nameOrCode ||
            c.names.en.toLowerCase() === nameOrCode.toLowerCase() ||
            c.names.es.toLowerCase() === nameOrCode.toLowerCase()
    );
}

/**
 * Find city by any name (English or Spanish)
 * Useful for backward compatibility with stored English names
 *
 * @param cityName - City name in any language
 * @param countryNameOrCode - Optional country to narrow search
 * @returns Object with English name (storage key) and localized names
 */
export function findCity(
    cityName: string,
    countryNameOrCode?: string
): { englishName: string; names: LocalizedNames } | undefined {
    if (!cityName) return undefined;

    const normalized = cityName.toLowerCase().trim();

    // If country is specified, search only that country
    if (countryNameOrCode) {
        const cities = getLocalizedCities(countryNameOrCode);
        const found = cities.find(
            (c) =>
                c.names.en.toLowerCase() === normalized ||
                c.names.es.toLowerCase() === normalized ||
                c.id.toLowerCase() === normalized
        );
        if (found) {
            return { englishName: found.id, names: found.names };
        }
    }

    // Search all countries
    for (const country of COUNTRIES) {
        const cities = getLocalizedCities(country);
        const found = cities.find(
            (c) =>
                c.names.en.toLowerCase() === normalized ||
                c.names.es.toLowerCase() === normalized
        );
        if (found) {
            return { englishName: found.id, names: found.names };
        }
    }

    // Check Spanish translations lookup directly
    for (const [en, es] of Object.entries(CITY_SPANISH_TRANSLATIONS)) {
        if (en.toLowerCase() === normalized || es.toLowerCase() === normalized) {
            return {
                englishName: en,
                names: { en, es },
            };
        }
    }

    return undefined;
}

/**
 * Map stored location to display location
 * For backward compatibility: stored values are in English
 *
 * @param stored - Stored location { country, city } in English
 * @param lang - Display language
 * @returns Display location { country, city } in target language
 */
export function mapStoredToDisplay(
    stored: { country?: string; city?: string },
    lang: SupportedLanguage
): { country: string; city: string } {
    return {
        country: stored.country ? getCountryDisplayName(stored.country, lang) : '',
        city: stored.city ? getCityDisplayName(stored.city, lang) : '',
    };
}

/**
 * Map display location back to storage location (English)
 * For saving user selections
 *
 * @param display - Display location in any language
 * @returns Storage location in English
 */
export function mapDisplayToStored(
    display: { country?: string; city?: string }
): { country: string; city: string } {
    let countryEn = display.country || '';
    let cityEn = display.city || '';

    // Find English name for country
    if (display.country) {
        const country = findCountry(display.country);
        if (country) {
            countryEn = country.names.en;
        }
    }

    // Find English name for city
    if (display.city) {
        const city = findCity(display.city, countryEn);
        if (city) {
            cityEn = city.englishName;
        }
    }

    return { country: countryEn, city: cityEn };
}

/**
 * Preload countries from API
 * Call this on app startup to warm the cache
 */
export function preloadCountries(): void {
    // Fire and forget - don't await
    getLocalizedCountries().catch(() => {
        // Silently fail - fallback data will be used
    });
}

/**
 * Clear the in-memory cache (for testing purposes)
 * @internal
 */
export function _clearLocationCache(): void {
    cachedCountries = null;
}
