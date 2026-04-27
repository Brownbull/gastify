/**
 * StoreTypeSelector Component
 * Story 9.8 AC#1: Horizontal scrollable store type quick-select labels
 *
 * Displays a row of store type buttons that the user can select before scanning.
 * The selection helps the AI better understand the receipt context.
 */

import React from 'react';
import { ReceiptType } from '@/services/gemini';

/**
 * Quick store types for the selector (subset of ReceiptType)
 * Story 9.8: These are the most common store types shown as quick-select labels
 */
export const QUICK_STORE_TYPES: Array<{
    id: ReceiptType;
    icon: string;
    labelKey: string;
}> = [
    { id: 'auto', icon: '✓', labelKey: 'storeTypeAuto' },
    { id: 'supermarket', icon: '🛒', labelKey: 'storeTypeSupermarket' },
    { id: 'restaurant', icon: '🍽️', labelKey: 'storeTypeRestaurant' },
    { id: 'gas_station', icon: '⛽', labelKey: 'storeTypeGasStation' },
    { id: 'pharmacy', icon: '💊', labelKey: 'storeTypePharmacy' },
    { id: 'parking', icon: '🅿️', labelKey: 'storeTypeParking' },
];

interface StoreTypeSelectorProps {
    /** Currently selected store type */
    selected: ReceiptType;
    /** Callback when selection changes */
    onSelect: (type: ReceiptType) => void;
    /** Translation function */
    t: (key: string) => string;
    /** Theme for styling */
    theme: 'light' | 'dark';
}

export const StoreTypeSelector: React.FC<StoreTypeSelectorProps> = ({
    selected,
    onSelect,
    t,
    theme,
}) => {
    const isDark = theme === 'dark';

    return (
        <div className="mb-3">
            <label
                className="block text-xs font-medium mb-2"
                style={{ color: 'var(--secondary)' }}
            >
                {t('storeType')}
            </label>
            <div
                className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
                role="radiogroup"
                aria-label={t('storeType')}
            >
                {QUICK_STORE_TYPES.map(({ id, icon, labelKey }) => {
                    const isSelected = selected === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onSelect(id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all shrink-0"
                            style={{
                                backgroundColor: isSelected
                                    ? 'var(--accent)'
                                    : isDark ? '#1e293b' : '#f8fafc',
                                borderColor: isSelected
                                    ? 'var(--accent)'
                                    : isDark ? '#475569' : '#e2e8f0',
                                color: isSelected
                                    ? '#ffffff'
                                    : 'var(--primary)',
                            }}
                        >
                            <span>{icon}</span>
                            <span>{t(labelKey)}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
