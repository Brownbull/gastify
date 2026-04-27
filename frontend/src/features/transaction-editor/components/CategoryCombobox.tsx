/**
 * CategoryCombobox Component
 *
 * Story 9.15: Searchable combobox for item category selection
 * AC #2.1: Category editable via searchable combobox with all ITEM_CATEGORIES, sorted alphabetically
 *
 * Features:
 * - Searchable/filterable dropdown
 * - 31 item categories sorted alphabetically
 * - Translated labels (English/Spanish)
 * - Theme-aware styling (light/dark)
 * - Mobile-friendly touch targets (44px min)
 * - WCAG 2.1 Level AA accessibility
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { ITEM_GROUP_TRANSLATIONS, translateItemGroup } from '@/utils/categoryTranslations';
import type { Language } from '@/utils/translations';

interface CategoryComboboxProps {
    /** Currently selected category value (English canonical) */
    value: string;
    /** Callback when selection changes */
    onChange: (value: string) => void;
    /** Current language for translations */
    language: Language;
    /** Theme for styling */
    theme: 'light' | 'dark';
    /** Placeholder text */
    placeholder?: string;
    /** Optional CSS class */
    className?: string;
    /** Accessible label */
    ariaLabel?: string;
}

export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
    value,
    onChange,
    language,
    theme,
    placeholder = 'Select category...',
    className = '',
    ariaLabel = 'Item category',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const isDark = theme === 'dark';

    // Get all categories sorted alphabetically by translated label
    const allCategories = useMemo(() => {
        const categories = Object.keys(ITEM_GROUP_TRANSLATIONS);
        return categories
            .map(cat => ({
                value: cat,
                label: translateItemGroup(cat, language),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, language === 'es' ? 'es' : 'en'));
    }, [language]);

    // Filter categories based on search text
    const filteredCategories = useMemo(() => {
        if (!searchText.trim()) return allCategories;
        const search = searchText.toLowerCase();
        return allCategories.filter(
            cat =>
                cat.label.toLowerCase().includes(search) ||
                cat.value.toLowerCase().includes(search)
        );
    }, [allCategories, searchText]);

    // Get display label for current value
    const displayLabel = value ? translateItemGroup(value, language) : '';

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchText('');
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlighted index when filtered list changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredCategories.length]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('li');
            if (items[highlightedIndex]) {
                items[highlightedIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchText('');
            setHighlightedIndex(-1);
            // Focus search input when opening
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    const handleSelect = (categoryValue: string) => {
        onChange(categoryValue);
        setIsOpen(false);
        setSearchText('');
        setHighlightedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 10);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredCategories.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredCategories[highlightedIndex]) {
                    handleSelect(filteredCategories[highlightedIndex].value);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchText('');
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                setSearchText('');
                setHighlightedIndex(-1);
                break;
        }
    };

    // Styling
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
    };

    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minHeight: '44px',
        padding: '8px 12px',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
        borderRadius: '8px',
        color: value ? 'var(--primary)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
    };

    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
        borderRadius: '8px',
        boxShadow: isDark
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
        maxHeight: '300px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const searchContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        gap: '8px',
    };

    const searchInputStyle: React.CSSProperties = {
        flex: 1,
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        color: 'var(--primary)',
        fontSize: '14px',
    };

    const listStyle: React.CSSProperties = {
        listStyle: 'none',
        margin: 0,
        padding: '4px 0',
        overflowY: 'auto',
        maxHeight: '250px',
    };

    const getItemStyle = (index: number, isSelected: boolean): React.CSSProperties => ({
        padding: '10px 12px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        backgroundColor:
            highlightedIndex === index
                ? isDark
                    ? '#334155'
                    : '#f1f5f9'
                : isSelected
                    ? isDark
                        ? '#1e3a5f'
                        : '#e0f2fe'
                    : 'transparent',
        color: 'var(--primary)',
        fontSize: '14px',
    });

    return (
        <div ref={containerRef} style={containerStyle} className={className}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                style={buttonStyle}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayLabel || placeholder}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {value && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleClear(e as unknown as React.MouseEvent);
                                }
                            }}
                            style={{
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                            }}
                            aria-label="Clear selection"
                        >
                            <X size={16} />
                        </span>
                    )}
                    <ChevronDown
                        size={18}
                        style={{
                            color: 'var(--muted)',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                        }}
                    />
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={dropdownStyle} role="listbox" aria-label={ariaLabel}>
                    {/* Search Input */}
                    <div style={searchContainerStyle}>
                        <Search size={16} style={{ color: 'var(--muted)' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                            style={searchInputStyle}
                            aria-label="Search categories"
                        />
                        {searchText && (
                            <button
                                type="button"
                                onClick={() => setSearchText('')}
                                style={{
                                    padding: '4px',
                                    display: 'flex',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--muted)',
                                }}
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <ul ref={listRef} style={listStyle}>
                        {filteredCategories.length === 0 ? (
                            <li
                                style={{
                                    padding: '12px',
                                    textAlign: 'center',
                                    color: 'var(--muted)',
                                    fontSize: '14px',
                                }}
                            >
                                {language === 'es' ? 'Sin resultados' : 'No results'}
                            </li>
                        ) : (
                            filteredCategories.map((cat, index) => (
                                <li
                                    key={cat.value}
                                    onClick={() => handleSelect(cat.value)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    style={getItemStyle(index, cat.value === value)}
                                    role="option"
                                    aria-selected={cat.value === value}
                                >
                                    {cat.label}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
