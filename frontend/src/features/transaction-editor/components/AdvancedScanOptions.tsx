/**
 * AdvancedScanOptions Component
 * Story 9.8 AC#2: Collapsible "Advanced Options" section with currency dropdown
 *
 * Provides additional scan options that most users won't need to change,
 * hidden behind a collapsible section to keep the UI clean.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SupportedCurrency } from '@/types/preferences';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';

interface AdvancedScanOptionsProps {
    /** Currently selected currency */
    currency: SupportedCurrency;
    /** Callback when currency changes */
    onCurrencyChange: (currency: SupportedCurrency) => void;
    /** Translation function */
    t: (key: string) => string;
    /** Theme for styling */
    theme: 'light' | 'dark';
}

export const AdvancedScanOptions: React.FC<AdvancedScanOptionsProps> = ({
    currency,
    onCurrencyChange,
    t,
    theme,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isDark = theme === 'dark';

    const inputStyle: React.CSSProperties = {
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderColor: isDark ? '#475569' : '#e2e8f0',
        color: 'var(--primary)',
    };

    return (
        <div className="mb-3">
            {/* Collapsible header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between py-2 text-sm"
                style={{ color: 'var(--secondary)' }}
                aria-expanded={isExpanded}
                aria-controls="advanced-scan-options"
            >
                <span className="font-medium">{t('advancedOptions')}</span>
                {isExpanded ? (
                    <ChevronUp size={18} />
                ) : (
                    <ChevronDown size={18} />
                )}
            </button>

            {/* Collapsible content */}
            {isExpanded && (
                <div
                    id="advanced-scan-options"
                    className="pt-2 pb-1 space-y-3"
                >
                    {/* Currency dropdown (AC#2) */}
                    <div>
                        <label
                            htmlFor="scan-currency"
                            className="block text-xs font-medium mb-1"
                            style={{ color: 'var(--secondary)' }}
                        >
                            {t('currency')}
                        </label>
                        <select
                            id="scan-currency"
                            value={currency}
                            onChange={(e) => onCurrencyChange(e.target.value as SupportedCurrency)}
                            className="w-full p-2 border rounded-lg text-sm"
                            style={inputStyle}
                            aria-label={t('currency')}
                        >
                            {SUPPORTED_CURRENCIES.map((curr) => (
                                <option key={curr} value={curr}>
                                    {t(`currency${curr.charAt(0) + curr.slice(1).toLowerCase()}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
};
