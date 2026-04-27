/**
 * ItemCategoryFilterBar Component
 *
 * Story 14.31: Items History View
 * Epic 14: Core Implementation
 *
 * Filter bar for item categories in the Items view.
 * Displays a dropdown button to filter by item category.
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.31-items-history-view.md
 */

import React, { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, Check } from 'lucide-react';
// Unused import removed - category colors not needed for filter bar
import { getItemCategoryEmoji } from '@/utils/categoryTranslations';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import type { Language } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

interface ItemCategoryFilterBarProps {
    /** Currently selected category (or undefined for "all") */
    selectedCategory?: string;
    /** Callback when category selection changes */
    onCategoryChange: (category: string | undefined) => void;
    /** Available categories to show in dropdown */
    categories: string[];
    /** Translation function (reserved for future use) */
    t?: (key: string) => string;
    /** Language for translations */
    lang: Language;
}

// ============================================================================
// Component
// ============================================================================

export const ItemCategoryFilterBar: React.FC<ItemCategoryFilterBarProps> = ({
    selectedCategory,
    onCategoryChange,
    categories,
    lang,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle category selection
    const handleSelect = (category: string | undefined) => {
        onCategoryChange(category);
        setIsOpen(false);
    };

    // Check if a category is selected
    const hasSelection = !!selectedCategory;

    return (
        <div className="relative">
            {/* Filter Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    hasSelection ? 'font-medium' : ''
                }`}
                style={{
                    backgroundColor: hasSelection ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: hasSelection ? 'white' : 'var(--text-secondary)',
                }}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={lang === 'es' ? 'Filtrar por categoría' : 'Filter by category'}
            >
                <Tag size={14} />
                <span>
                    {selectedCategory
                        ? selectedCategory
                        : (lang === 'es' ? 'Categoría' : 'Category')
                    }
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-lg shadow-lg border"
                    style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border-light)',
                        zIndex: 70,
                    }}
                    role="listbox"
                    aria-label={lang === 'es' ? 'Categorías de productos' : 'Item categories'}
                >
                    {/* All Categories Option */}
                    <button
                        onClick={() => handleSelect(undefined)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                        style={{
                            color: !selectedCategory ? 'var(--primary)' : 'var(--text-primary)',
                        }}
                        role="option"
                        aria-selected={!selectedCategory}
                    >
                        <span>{lang === 'es' ? 'Todas las categorías' : 'All categories'}</span>
                        {!selectedCategory && (
                            <Check size={16} style={{ color: 'var(--primary)' }} />
                        )}
                    </button>

                    {/* Divider */}
                    <div
                        className="h-px mx-2"
                        style={{ backgroundColor: 'var(--border-light)' }}
                    />

                    {/* Category Options */}
                    {categories.length > 0 ? (
                        categories.map((category) => {
                            const normalized = normalizeItemCategory(category);
                            const emoji = getItemCategoryEmoji(normalized);
                            const isSelected = selectedCategory === category;

                            return (
                                <button
                                    key={category}
                                    onClick={() => handleSelect(category)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                                    style={{
                                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                    }}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{emoji}</span>
                                        <span>{category}</span>
                                    </div>
                                    {isSelected && (
                                        <Check size={16} style={{ color: 'var(--primary)' }} />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div
                            className="px-3 py-4 text-sm text-center"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {lang === 'es' ? 'Sin categorías disponibles' : 'No categories available'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ItemCategoryFilterBar;
