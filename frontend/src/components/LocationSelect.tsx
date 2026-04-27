import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { Language } from '../types/settings';
import {
    useLocalizedCountries,
    useLocalizedCities,
    useLocationDisplay,
} from '../hooks/useLocations';
import { useIsForeignLocation } from '../hooks/useIsForeignLocation';

interface LocationSelectProps {
    /** Country value (stored as English name) */
    country: string;
    /** City value (stored as English name) */
    city: string;
    /** Callback when country changes (receives English name for storage) */
    onCountryChange: (country: string) => void;
    /** Callback when city changes (receives English name for storage) */
    onCityChange: (city: string) => void;
    inputStyle: React.CSSProperties;
    /** Optional placeholder for country select */
    countryPlaceholder?: string;
    /** Optional placeholder for city select */
    cityPlaceholder?: string;
    /** Theme for styling */
    theme?: 'light' | 'dark';
    /** Translation function */
    t?: (key: string) => string;
    /** Language for localization (default: 'es') */
    lang?: Language;
    /** Story 14.35b: User's default country for foreign location detection */
    userDefaultCountry?: string;
    /** Story 14.41: Disable the location selector in read-only mode */
    disabled?: boolean;
}

/**
 * Location selection component with dropdown panel
 * Story 14.14b Session 4: Updated to match scan-overlay mockup with floating labels
 * Story 14.35: Added localization support for countries and cities
 *
 * - Shows clickable tag with city + country in user's language
 * - Opens dropdown panel with floating label selects for País and Ciudad
 * - Stores values in English for backward compatibility
 * - Displays values in user's language (Spanish/English)
 * - Changing country resets city if current city isn't in new country
 */
export const LocationSelect: React.FC<LocationSelectProps> = ({
    country,
    city,
    onCountryChange,
    onCityChange,
    inputStyle,
    countryPlaceholder = 'País',
    cityPlaceholder = 'Ciudad / Comuna',
    // theme kept for API compatibility but not used (colors now use CSS variables)
    theme: _theme = 'light',
    t,
    lang = 'es',
    userDefaultCountry,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Story 14.35: Use localized data
    const { countries } = useLocalizedCountries({ lang });
    const { cities } = useLocalizedCities(country, { lang });
    const { getLocationString, getCountryName, getCityName } = useLocationDisplay(lang);

    // Story 14.35b: Detect foreign location for flag display
    const { isForeign, flagEmoji } = useIsForeignLocation(country, userDefaultCountry);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Find city English names for the current country (for validation)
    const cityEnglishNames = useMemo(
        () => new Set(cities.map((c) => c.names.en)),
        [cities]
    );

    const handleCountryChange = (newCountryEn: string) => {
        onCountryChange(newCountryEn);
        // Reset city if it's not valid for the new country
        if (city && !cityEnglishNames.has(city)) {
            onCityChange('');
        }
    };

    const handleConfirm = () => {
        setIsOpen(false);
    };

    // Display text: "City, Country" in user's language
    const displayText = useMemo(() => {
        if (city && country) {
            return getLocationString(city, country);
        }
        if (city) return getCityName(city);
        if (country) return getCountryName(country);
        return t ? t('selectLocation') : 'Seleccionar ubicación';
    }, [city, country, getLocationString, getCityName, getCountryName, t]);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Clickable tag - matches other pill styling */}
            {/* Story 14.35b: Show flag for foreign locations */}
            {/* Story 14.41: Disabled state for read-only mode */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    opacity: disabled ? 0.7 : 1,
                    cursor: disabled ? 'default' : 'pointer',
                }}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <MapPin size={12} />
                {isForeign && <span>{flagEmoji}</span>}
                <span className="max-w-[150px] truncate">{displayText}</span>
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 min-w-[240px] rounded-xl overflow-hidden z-50"
                    style={{
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border-light, #e2e8f0)',
                    }}
                >
                    <div className="p-3 space-y-3">
                        {/* Country select with floating label */}
                        <div className="relative">
                            <label
                                className="absolute -top-2 left-2.5 px-1 text-xs font-medium z-10"
                                style={{
                                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                                    color: 'var(--primary, #2563eb)',
                                }}
                            >
                                {countryPlaceholder}
                            </label>
                            <select
                                className="w-full h-10 px-3 pr-8 border rounded-lg text-sm cursor-pointer appearance-none"
                                style={{
                                    ...inputStyle,
                                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 10px center',
                                }}
                                value={country}
                                onChange={(e) => handleCountryChange(e.target.value)}
                                aria-label={countryPlaceholder}
                            >
                                <option value="">—</option>
                                {countries.map((c) => (
                                    <option key={c.code} value={c.names.en}>
                                        {c.names[lang]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* City select with floating label */}
                        <div className="relative">
                            <label
                                className="absolute -top-2 left-2.5 px-1 text-xs font-medium z-10"
                                style={{
                                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                                    color: 'var(--primary, #2563eb)',
                                }}
                            >
                                {cityPlaceholder}
                            </label>
                            <select
                                className="w-full h-10 px-3 pr-8 border rounded-lg text-sm cursor-pointer appearance-none"
                                style={{
                                    ...inputStyle,
                                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 10px center',
                                }}
                                value={city}
                                onChange={(e) => onCityChange(e.target.value)}
                                disabled={!country}
                                aria-label={cityPlaceholder}
                            >
                                <option value="">—</option>
                                {cities.map((c) => (
                                    <option key={c.id} value={c.names.en}>
                                        {c.names[lang]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Confirm button */}
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: 'var(--primary-light, #dbeafe)',
                                color: 'var(--primary, #2563eb)',
                            }}
                        >
                            {t ? t('confirm') : 'Confirmar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
