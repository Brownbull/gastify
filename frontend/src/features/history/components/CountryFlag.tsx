/**
 * CountryFlag Component
 *
 * Story 14.35b: Displays a country flag emoji with configurable size.
 * Used to indicate foreign transactions in transaction lists and cards.
 */

import React from 'react';
import { getCountryFlag } from '@/utils/countryFlags';

export type FlagSize = 'small' | 'medium' | 'large';

export interface CountryFlagProps {
    /** Country name (e.g., 'Chile') or ISO code (e.g., 'CL') */
    country: string | undefined | null;
    /** Size variant: small (12px), medium (16px), large (20px) */
    size?: FlagSize;
    /** Additional CSS class names */
    className?: string;
    /** Accessible label for screen readers */
    ariaLabel?: string;
}

/**
 * Font size mapping for flag sizes.
 * Emoji flags scale with font size.
 */
const SIZE_MAP: Record<FlagSize, string> = {
    small: 'text-xs',   // 12px
    medium: 'text-base', // 16px
    large: 'text-xl',   // 20px
};

/**
 * CountryFlag renders a flag emoji for the given country.
 *
 * @example
 * // Basic usage
 * <CountryFlag country="Chile" />
 *
 * @example
 * // With size
 * <CountryFlag country="United States" size="large" />
 *
 * @example
 * // For unknown country, shows white flag
 * <CountryFlag country="Unknown" />
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
    country,
    size = 'medium',
    className = '',
    ariaLabel,
}) => {
    const flag = getCountryFlag(country);
    const sizeClass = SIZE_MAP[size];

    // Generate aria-label if not provided
    const label = ariaLabel ?? (country ? `Flag of ${country}` : 'Unknown location');

    return (
        <span
            role="img"
            aria-label={label}
            className={`inline-block leading-none ${sizeClass} ${className}`.trim()}
        >
            {flag}
        </span>
    );
};

export default CountryFlag;
