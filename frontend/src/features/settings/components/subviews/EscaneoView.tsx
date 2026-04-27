/**
 * EscaneoView Sub-View
 * Story 14.22 AC #6: Default scan currency and location settings
 * Story 14.35b: Added foreign location display format toggle
 *
 * Migrates scan defaults from flat SettingsView into dedicated sub-view
 */

import React from 'react';
import { Receipt, MapPin, Globe } from 'lucide-react';
import { LocationSelect } from '@/components/LocationSelect';
import type { SupportedCurrency, ForeignLocationDisplayFormat } from '@/types/preferences';
import { SUPPORTED_CURRENCIES } from '@/utils/currency';
import { DEFAULT_CURRENCY } from '@/utils/currency';

interface EscaneoViewProps {
    t: (key: string) => string;
    theme: string;
    defaultScanCurrency?: SupportedCurrency;
    defaultCountry?: string;
    defaultCity?: string;
    /** Story 14.35b: Foreign location display format */
    foreignLocationFormat?: ForeignLocationDisplayFormat;
    onSetDefaultScanCurrency?: (currency: SupportedCurrency) => void;
    onSetDefaultCountry?: (country: string) => void;
    onSetDefaultCity?: (city: string) => void;
    /** Story 14.35b: Handler for foreign location format change */
    onSetForeignLocationFormat?: (format: ForeignLocationDisplayFormat) => void;
}

export const EscaneoView: React.FC<EscaneoViewProps> = ({
    t,
    theme,
    defaultScanCurrency = DEFAULT_CURRENCY,
    defaultCountry = '',
    defaultCity = '',
    foreignLocationFormat = 'code',
    onSetDefaultScanCurrency,
    onSetDefaultCountry,
    onSetDefaultCity,
    onSetForeignLocationFormat,
}) => {
    const isDark = theme === 'dark';

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-secondary)',
        borderColor: isDark ? '#334155' : '#e2e8f0',
    };

    const inputStyle: React.CSSProperties = {
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderColor: isDark ? '#475569' : '#e2e8f0',
        color: 'var(--text-primary)',
    };

    return (
        <div className="space-y-4">
            {/* Default Scan Currency */}
            {onSetDefaultScanCurrency && (
                <div className="p-4 rounded-xl border" style={cardStyle}>
                    <div className="flex gap-2 items-center mb-2" style={{ color: 'var(--text-primary)' }}>
                        <Receipt size={24} strokeWidth={2} /> {t('defaultScanCurrency')}
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {t('defaultScanCurrencyHint')}
                    </p>
                    <select
                        value={defaultScanCurrency}
                        onChange={(e) => onSetDefaultScanCurrency(e.target.value as SupportedCurrency)}
                        className="w-full p-3 border rounded-lg text-sm"
                        style={inputStyle}
                        aria-label={t('defaultScanCurrency')}
                    >
                        {SUPPORTED_CURRENCIES.map((curr) => (
                            <option key={curr} value={curr}>
                                {t(`currency${curr.charAt(0) + curr.slice(1).toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Default Location */}
            {onSetDefaultCountry && onSetDefaultCity && (
                <div className="p-4 rounded-xl border" style={cardStyle}>
                    <div className="flex gap-2 items-center mb-2" style={{ color: 'var(--text-primary)' }}>
                        <MapPin size={24} strokeWidth={2} /> {t('defaultLocation')}
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {t('defaultLocationHint')}
                    </p>
                    <LocationSelect
                        country={defaultCountry}
                        city={defaultCity}
                        onCountryChange={onSetDefaultCountry}
                        onCityChange={onSetDefaultCity}
                        inputStyle={inputStyle}
                    />
                </div>
            )}

            {/* Story 14.35b: Foreign Location Display Format */}
            {onSetForeignLocationFormat && (
                <div className="p-4 rounded-xl border" style={cardStyle}>
                    <div className="flex gap-2 items-center mb-2" style={{ color: 'var(--text-primary)' }}>
                        <Globe size={24} strokeWidth={2} /> {t('foreignLocationFormat')}
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {t('foreignLocationFormatHint')}
                    </p>
                    <div className="space-y-2">
                        {/* Country Code Option */}
                        <label
                            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                            style={{
                                ...inputStyle,
                                borderColor: foreignLocationFormat === 'code'
                                    ? 'var(--primary)'
                                    : inputStyle.borderColor,
                                backgroundColor: foreignLocationFormat === 'code'
                                    ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                                    : inputStyle.backgroundColor,
                            }}
                        >
                            <input
                                type="radio"
                                name="foreignLocationFormat"
                                value="code"
                                checked={foreignLocationFormat === 'code'}
                                onChange={() => onSetForeignLocationFormat('code')}
                                className="w-4 h-4 accent-blue-500"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {t('foreignLocationFormatCode')}
                                    </span>
                                    {/* Preview badge */}
                                    <span
                                        className="px-1.5 py-0.5 rounded text-xs"
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        US Orlando
                                    </span>
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {t('foreignLocationFormatCodeDesc')}
                                </div>
                            </div>
                        </label>

                        {/* Flag Icon Option */}
                        <label
                            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                            style={{
                                ...inputStyle,
                                borderColor: foreignLocationFormat === 'flag'
                                    ? 'var(--primary)'
                                    : inputStyle.borderColor,
                                backgroundColor: foreignLocationFormat === 'flag'
                                    ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                                    : inputStyle.backgroundColor,
                            }}
                        >
                            <input
                                type="radio"
                                name="foreignLocationFormat"
                                value="flag"
                                checked={foreignLocationFormat === 'flag'}
                                onChange={() => onSetForeignLocationFormat('flag')}
                                className="w-4 h-4 accent-blue-500"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {t('foreignLocationFormatFlag')}
                                    </span>
                                    {/* Preview badge with flag icon */}
                                    <span
                                        className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1"
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        <span className="fi fi-us" style={{ fontSize: '12px' }} />
                                        Orlando
                                    </span>
                                </div>
                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {t('foreignLocationFormatFlagDesc')}
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};
