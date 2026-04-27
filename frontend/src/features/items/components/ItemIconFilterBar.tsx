/**
 * ItemIconFilterBar Component
 *
 * Story 14.31 Session 2: Items History View - Filter Bar
 * Epic 14: Core Implementation
 *
 * Icon-based filter bar for Items view.
 * Shows Tag icon for item category filtering.
 * Temporal filtering is handled by TemporalBreadcrumb (shared with HistoryView).
 *
 * Pattern matches IconFilterBar from HistoryView but simplified for item-specific filters.
 *
 * @see src/features/history/components/IconFilterBar.tsx - Reference implementation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, Check } from 'lucide-react';
import type { Language } from '@/utils/translations';
import { translateItemGroup } from '@/utils/categoryTranslations';

// ============================================================================
// Types
// ============================================================================

interface ItemIconFilterBarProps {
    /** Currently selected category (or undefined for all) */
    selectedCategory?: string;
    /** Callback when category changes */
    onCategoryChange: (category: string | undefined) => void;
    /** Available item categories to choose from */
    categories: string[];
    /** Translation function */
    t: (key: string) => string;
    /** Locale for translations */
    locale?: Language;
}

// ============================================================================
// Component
// ============================================================================

export const ItemIconFilterBar: React.FC<ItemIconFilterBarProps> = ({
    selectedCategory,
    onCategoryChange,
    categories,
    t,
    locale = 'en',
}) => {
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryButtonRef = useRef<HTMLButtonElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                categoryDropdownRef.current &&
                !categoryDropdownRef.current.contains(target) &&
                categoryButtonRef.current &&
                !categoryButtonRef.current.contains(target)
            ) {
                setShowCategoryDropdown(false);
            }
        };

        if (showCategoryDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showCategoryDropdown]);

    // Handle category selection
    const handleCategorySelect = useCallback((category: string | undefined) => {
        onCategoryChange(category);
        setShowCategoryDropdown(false);
    }, [onCategoryChange]);

    // Check if category filter is active
    const hasCategoryFilter = !!selectedCategory;

    // Icon button base styles
    const iconButtonBase = `
        w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-150 cursor-pointer
        border relative
    `;

    // Active/inactive styles
    const activeStyle: React.CSSProperties = {
        backgroundColor: 'var(--primary-light)',
        borderColor: 'var(--primary)',
        color: 'var(--primary)',
    };

    const inactiveStyle: React.CSSProperties = {
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-light)',
        color: 'var(--text-secondary)',
    };

    // Dropdown styles
    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        minWidth: '180px',
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 70,
        border: '1px solid var(--border-light)',
    };

    return (
        <div className="flex items-center gap-2 relative">
            {/* Category Filter (Tag icon) */}
            <div className="relative">
                <button
                    ref={categoryButtonRef}
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className={iconButtonBase}
                    style={hasCategoryFilter ? activeStyle : inactiveStyle}
                    aria-label={t('filterByCategory')}
                    aria-expanded={showCategoryDropdown}
                    aria-haspopup="listbox"
                >
                    <Tag size={18} />
                    {/* Active indicator dot */}
                    {hasCategoryFilter && (
                        <span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--primary)' }}
                        />
                    )}
                </button>

                {/* Category Dropdown */}
                {showCategoryDropdown && (
                    <div
                        ref={categoryDropdownRef}
                        style={dropdownStyle}
                        role="listbox"
                        aria-label={t('selectCategory')}
                    >
                        {/* All Categories option */}
                        <button
                            onClick={() => handleCategorySelect(undefined)}
                            className="w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                            style={{
                                color: !selectedCategory ? 'var(--primary)' : 'var(--text-primary)',
                                fontWeight: !selectedCategory ? 600 : 400,
                            }}
                            role="option"
                            aria-selected={!selectedCategory}
                        >
                            <span>{locale === 'es' ? 'Todas las categorías' : 'All categories'}</span>
                            {!selectedCategory && <Check size={16} style={{ color: 'var(--primary)' }} />}
                        </button>

                        {/* Divider */}
                        <div
                            className="mx-3 my-1"
                            style={{ borderTop: '1px solid var(--border-light)' }}
                        />

                        {/* Category options */}
                        {categories.map((category) => {
                            const isSelected = selectedCategory === category;
                            const displayName = translateItemGroup(category, locale);

                            return (
                                <button
                                    key={category}
                                    onClick={() => handleCategorySelect(category)}
                                    className="w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors"
                                    style={{
                                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                        fontWeight: isSelected ? 600 : 400,
                                    }}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <span>{displayName}</span>
                                    {isSelected && <Check size={16} style={{ color: 'var(--primary)' }} />}
                                </button>
                            );
                        })}

                        {/* Empty state if no categories */}
                        {categories.length === 0 && (
                            <div
                                className="px-4 py-6 text-center text-sm"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                {locale === 'es' ? 'Sin categorías' : 'No categories'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemIconFilterBar;
