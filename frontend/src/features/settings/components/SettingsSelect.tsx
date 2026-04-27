/**
 * SettingsSelect Component
 * Story 14.22: Custom dropdown select matching mockup design
 *
 * Features:
 * - Label above value (uppercase, small text)
 * - Value display with chevron
 * - Animated dropdown with checkmark for selected option
 * - Click outside to close
 * - Keyboard accessible
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

interface SettingsSelectProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    'aria-label'?: string;
    /** Story 14.36: When true, dropdown opens upward instead of downward */
    dropUp?: boolean;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
    label,
    value,
    options,
    onChange,
    'aria-label': ariaLabel,
    dropUp = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get display label for current value
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || value;

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsOpen(!isOpen);
        } else if (event.key === 'Escape') {
            setIsOpen(false);
        } else if (event.key === 'ArrowDown' && isOpen) {
            event.preventDefault();
            const currentIndex = options.findIndex((opt) => opt.value === value);
            const nextIndex = (currentIndex + 1) % options.length;
            onChange(options[nextIndex].value);
        } else if (event.key === 'ArrowUp' && isOpen) {
            event.preventDefault();
            const currentIndex = options.findIndex((opt) => opt.value === value);
            const prevIndex = (currentIndex - 1 + options.length) % options.length;
            onChange(options[prevIndex].value);
        }
    };

    const handleOptionClick = (optionValue: string, event: React.MouseEvent) => {
        event.stopPropagation();
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={ariaLabel || label}
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className="flex items-center justify-between cursor-pointer transition-all"
                style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-lg, 12px)',
                    boxShadow: isOpen ? '0 0 0 3px var(--primary-light)' : 'none',
                }}
            >
                {/* Story 14.37: Font sizes scale with font size setting */}
                <div>
                    <div
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                            color: 'var(--text-tertiary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            marginBottom: '4px',
                        }}
                    >
                        {label}
                    </div>
                    <div
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                        }}
                    >
                        {displayValue}
                    </div>
                </div>
                <ChevronDown
                    size={20}
                    style={{
                        color: 'var(--text-tertiary)',
                        transition: 'transform 0.2s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                    }}
                />
            </div>

            {/* Dropdown - Story 14.36: Support dropUp for bottom-of-screen selectors */}
            <div
                role="listbox"
                aria-label={`${label} options`}
                style={{
                    position: 'absolute',
                    ...(dropUp
                        ? { bottom: 'calc(100% + 6px)' }
                        : { top: 'calc(100% + 6px)' }
                    ),
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    boxShadow: dropUp
                        ? '0 -10px 25px -5px rgba(0,0,0,0.1), 0 -8px 10px -6px rgba(0,0,0,0.1)'
                        : '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    opacity: isOpen ? 1 : 0,
                    visibility: isOpen ? 'visible' : 'hidden',
                    transform: isOpen
                        ? 'translateY(0)'
                        : dropUp
                            ? 'translateY(8px)'
                            : 'translateY(-8px)',
                    transition: 'all 0.2s ease',
                    zIndex: 100,
                    maxHeight: '240px',
                    overflowY: 'auto',
                }}
            >
                {options.map((option, index) => {
                    const isSelected = option.value === value;
                    const isFirst = index === 0;
                    const isLast = index === options.length - 1;

                    return (
                        <div
                            key={option.value}
                            role="option"
                            aria-selected={isSelected}
                            onClick={(e) => handleOptionClick(option.value, e)}
                            className="flex items-center justify-between cursor-pointer transition-colors"
                            style={{
                                padding: '12px 16px',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                                borderRadius: isFirst
                                    ? 'var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0'
                                    : isLast
                                      ? '0 0 var(--radius-lg, 12px) var(--radius-lg, 12px)'
                                      : '0',
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isSelected
                                    ? 'var(--primary-light)'
                                    : 'transparent';
                            }}
                        >
                            <span>{option.label}</span>
                            {isSelected && (
                                <Check
                                    size={14}
                                    strokeWidth={3}
                                    style={{ color: 'var(--primary)' }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
