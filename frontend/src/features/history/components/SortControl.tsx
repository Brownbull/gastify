/**
 * SortControl - Compact Sort Dropdown Component
 *
 * Story 14.31 Session 3: Sort control for ItemsView and HistoryView
 *
 * Features:
 * - Compact button showing current sort + direction indicator
 * - Dropdown with sort options
 * - Click same option to toggle direction
 * - Consistent styling with existing filter controls
 *
 * @example
 * ```tsx
 * <SortControl
 *   options={[
 *     { key: 'date', labelEn: 'Date', labelEs: 'Fecha' },
 *     { key: 'price', labelEn: 'Price', labelEs: 'Precio' },
 *   ]}
 *   currentSort="date"
 *   sortDirection="desc"
 *   onSortChange={(key, dir) => setSortState({ key, dir })}
 *   lang="es"
 * />
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SortOption {
    /** Unique key for this sort option */
    key: string;
    /** English label */
    labelEn: string;
    /** Spanish label */
    labelEs: string;
}

export interface SortControlProps {
    /** Available sort options */
    options: SortOption[];
    /** Currently selected sort key */
    currentSort: string;
    /** Current sort direction */
    sortDirection: 'asc' | 'desc';
    /** Callback when sort changes */
    onSortChange: (key: string, direction: 'asc' | 'desc') => void;
    /** Language for labels */
    lang: 'en' | 'es';
}

// ============================================================================
// Component
// ============================================================================

export const SortControl: React.FC<SortControlProps> = ({
    options,
    currentSort,
    sortDirection,
    onSortChange,
    lang,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Get current option label
    const currentOption = options.find(opt => opt.key === currentSort);
    const currentLabel = currentOption
        ? (lang === 'es' ? currentOption.labelEs : currentOption.labelEn)
        : '';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close dropdown on Escape
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    // Handle option selection
    const handleOptionClick = useCallback((key: string) => {
        if (key === currentSort) {
            // Toggle direction if same option selected
            onSortChange(key, sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // New option - default to desc for most, asc for name
            const defaultDirection = key === 'name' || key === 'merchant' ? 'asc' : 'desc';
            onSortChange(key, defaultDirection);
        }
        setIsOpen(false);
    }, [currentSort, sortDirection, onSortChange]);

    return (
        <div ref={containerRef} className="relative" style={{ zIndex: isOpen ? 60 : 'auto' }}>
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-colors"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                }}
                aria-label={lang === 'es' ? `Ordenar por ${currentLabel}` : `Sort by ${currentLabel}`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <ArrowUpDown size={14} />
                <span className="max-w-[70px] truncate">{currentLabel}</span>
                {sortDirection === 'desc' ? (
                    <ArrowDown size={12} />
                ) : (
                    <ArrowUp size={12} />
                )}
                <ChevronDown
                    size={12}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu - z-index 100 to appear above all content including cards */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg min-w-[120px]"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border-light)',
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                    role="listbox"
                    aria-label={lang === 'es' ? 'Opciones de orden' : 'Sort options'}
                >
                    {options.map((option) => {
                        const isSelected = option.key === currentSort;
                        const label = lang === 'es' ? option.labelEs : option.labelEn;

                        return (
                            <button
                                key={option.key}
                                onClick={() => handleOptionClick(option.key)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
                                style={{
                                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                    fontWeight: isSelected ? 600 : 400,
                                }}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <span>{label}</span>
                                {isSelected && (
                                    <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                        {sortDirection === 'desc' ? (
                                            <>
                                                <ArrowDown size={12} />
                                                {option.key === 'name' || option.key === 'merchant' ? 'Z-A' : (lang === 'es' ? 'Mayor' : 'High')}
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUp size={12} />
                                                {option.key === 'name' || option.key === 'merchant' ? 'A-Z' : (lang === 'es' ? 'Menor' : 'Low')}
                                            </>
                                        )}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SortControl;
