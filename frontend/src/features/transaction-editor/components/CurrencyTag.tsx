import React, { useState, useRef, useEffect } from 'react';

// Currency options with symbols
const CURRENCIES = [
    { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
    { code: 'USD', symbol: 'US$', name: 'US Dollar' },
    { code: 'EUR', symbol: '\u20ac', name: 'Euro' },
    { code: 'ARS', symbol: 'AR$', name: 'Peso Argentino' },
    { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
    { code: 'COP', symbol: 'COL$', name: 'Peso Colombiano' },
    { code: 'MXN', symbol: 'MX$', name: 'Peso Mexicano' },
    { code: 'GBP', symbol: '\u00a3', name: 'British Pound' },
];

interface CurrencyTagProps {
    currency: string;
    onCurrencyChange: (currency: string) => void;
    t?: (key: string) => string;
    /** Story 14.41: Disable the currency selector in read-only mode */
    disabled?: boolean;
}

/**
 * Currency selection component with dropdown panel
 * Story 14.14b Session 4: Updated to match scan-overlay mockup with floating labels
 *
 * - Shows clickable tag with currency symbol
 * - Opens dropdown panel with floating label select
 */
// Story 14e-32: Dropdown positioning constants
const DROPDOWN_WIDTH = 200; // matches min-w-[200px]
const DROPDOWN_MARGIN = 20;
const MIN_SPACE_REQUIRED = DROPDOWN_WIDTH + DROPDOWN_MARGIN;

export const CurrencyTag: React.FC<CurrencyTagProps> = ({
    currency,
    onCurrencyChange,
    t,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    /**
     * Story 14e-32: Calculate dropdown position based on button location
     * Uses button ref (not dropdown ref) to avoid render flash
     * Returns 'left' if dropdown would extend past right edge, 'right' otherwise
     */
    const getDropdownPosition = (): 'left' | 'right' => {
        if (!buttonRef.current) return 'right';
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.right;
        return spaceOnRight < MIN_SPACE_REQUIRED ? 'left' : 'right';
    };

    // Calculate position synchronously when open (button exists before dropdown)
    const dropdownPosition = isOpen ? getDropdownPosition() : 'right';

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

    // Get symbol for current currency
    const currentCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    const displaySymbol = currentCurrency.symbol;

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-medium)',
        color: 'var(--text-primary)',
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Clickable tag */}
            {/* Story 14.41: Disabled state for read-only mode */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    minWidth: '40px',
                    opacity: disabled ? 0.7 : 1,
                    cursor: disabled ? 'default' : 'pointer',
                }}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {displaySymbol}
            </button>

            {/* Dropdown panel - Story 14e-32: Dynamic positioning */}
            {isOpen && (
                <div
                    className={`absolute top-full ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} mt-2 min-w-[200px] rounded-xl overflow-hidden z-50`}
                    style={{
                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border-light, #e2e8f0)',
                    }}
                >
                    <div className="p-3 space-y-3">
                        <div className="relative">
                            <label
                                className="absolute -top-2 left-2.5 px-1 text-xs font-medium z-10"
                                style={{
                                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                                    color: 'var(--primary, #2563eb)',
                                }}
                            >
                                {t ? t('currency') : 'Moneda'}
                            </label>
                            <select
                                className="w-full h-10 px-3 border rounded-lg text-sm cursor-pointer"
                                style={inputStyle}
                                value={currency}
                                onChange={e => onCurrencyChange(e.target.value)}
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>
                                        {c.code} - {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
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
