/**
 * CategoryBreadcrumb Component
 *
 * Collapsible breadcrumb showing current category filter in the analytics hierarchy.
 * Allows users to see what's filtered (Category/Group/Subcategory) and jump back to broader categories.
 *
 * @see docs/architecture-epic7.md - Pattern 3: Breadcrumb Dropdown Pattern
 * @see docs/sprint-artifacts/epic7/story-7.3-category-breadcrumb-component.md
 * @see docs/sprint-artifacts/epic7/story-7.9-ux-breadcrumb-alignment.md - UX redesign
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tag } from 'lucide-react';
import { useAnalyticsNavigation } from '../hooks/useAnalyticsNavigation';
import type { CategoryPosition, CategoryLevel } from '@/types/analytics';
import { TRANSLATIONS } from '@/utils/translations';
// Story 9.12: Category translations
import { translateCategory } from '@/utils/categoryTranslations';
import type { Language } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

interface BreadcrumbItem {
  level: CategoryLevel;
  label: string;
  levelLabel: string; // Translated level indicator (e.g., "Category", "Group")
  position: CategoryPosition;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets translation for a key based on current language setting.
 */
function t(key: string, language: string = 'en'): string {
  const lang = language as keyof typeof TRANSLATIONS;
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return (translations as Record<string, string>)[key] || key;
}

/**
 * Gets the translated level label for a category level.
 */
function getLevelLabel(level: CategoryLevel, locale: string = 'en'): string {
  const levelKeys: Record<CategoryLevel, string> = {
    all: 'levelAll',
    category: 'levelCategory',
    group: 'levelGroup',
    subcategory: 'levelSubcategory',
  };
  return t(levelKeys[level], locale);
}

/**
 * Builds the category breadcrumb path from the current category position.
 * Returns an array of items from "All Categories" down to the current level.
 * Story 9.12: Labels are now translated using translateCategory.
 */
function buildCategoryPath(category: CategoryPosition, language: string = 'en'): BreadcrumbItem[] {
  const path: BreadcrumbItem[] = [];
  const lang = (language === 'es' ? 'es' : 'en') as Language;

  // "All Categories" is always first
  path.push({
    level: 'all',
    label: t('allCategories', language),
    levelLabel: getLevelLabel('all', language),
    position: { level: 'all' },
  });

  // Category (if filtering by category or deeper) - Story 9.12: Translate label
  if (category.category) {
    path.push({
      level: 'category',
      label: translateCategory(category.category, lang),
      levelLabel: getLevelLabel('category', language),
      position: { level: 'category', category: category.category },
    });
  }

  // Group (if filtering by group or deeper) - Story 9.12: Translate label
  if (category.group) {
    path.push({
      level: 'group',
      label: translateCategory(category.group, lang),
      levelLabel: getLevelLabel('group', language),
      position: {
        level: 'group',
        category: category.category,
        group: category.group,
      },
    });
  }

  // Subcategory (if filtering by subcategory) - Story 9.12: Translate label
  if (category.subcategory) {
    path.push({
      level: 'subcategory',
      label: translateCategory(category.subcategory, lang),
      levelLabel: getLevelLabel('subcategory', language),
      position: category,
    });
  }

  return path;
}

/**
 * Gets the display label for the collapsed breadcrumb button.
 * Shows short "All" when no filter, or the deepest level when filtering.
 * Story 7.10: Changed from "All Categories" to "All" for consistent breadcrumb height.
 * Story 9.12: Labels are now translated.
 */
function getCurrentLabel(category: CategoryPosition, language: string = 'en'): string {
  const lang = (language === 'es' ? 'es' : 'en') as Language;
  switch (category.level) {
    case 'all':
      // Use short label to match temporal breadcrumb height
      return t('levelAll', language);
    case 'category':
      return category.category ? translateCategory(category.category, lang) : '';
    case 'group':
      return category.group ? translateCategory(category.group, lang) : '';
    case 'subcategory':
      return category.subcategory ? translateCategory(category.subcategory, lang) : '';
    default:
      return t('levelAll', language);
  }
}

// ============================================================================
// Component Props
// ============================================================================

export interface CategoryBreadcrumbProps {
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for i18n (en/es) */
  locale?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CategoryBreadcrumb Component
 *
 * Displays a collapsible breadcrumb showing the current category filter.
 * Users can tap to expand and see the full path, then tap any ancestor to navigate.
 *
 * @example
 * <CategoryBreadcrumb theme="light" locale="en" />
 */
export function CategoryBreadcrumb({
  theme = 'light',
  locale = 'en',
}: CategoryBreadcrumbProps): React.ReactElement {
  const { category, dispatch } = useAnalyticsNavigation();

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Build the breadcrumb path
  const path = buildCategoryPath(category, locale);
  const currentLabel = getCurrentLabel(category, locale);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  // Close on outside click (AC #8)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle navigation to category level
  const handleNavigate = useCallback((position: CategoryPosition) => {
    if (position.level === 'all') {
      // Clear filter when selecting "All Categories"
      dispatch({ type: 'CLEAR_CATEGORY_FILTER' });
    } else {
      // Set category filter (preserves temporal position via dual-axis independence)
      dispatch({ type: 'SET_CATEGORY_FILTER', payload: position });
    }
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  }, [dispatch]);

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        // Opening: set focus to current level
        setFocusedIndex(path.length - 1);
      } else {
        setFocusedIndex(-1);
      }
      return !prev;
    });
  }, [path.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open on Enter or Space when collapsed
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, path.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(path.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < path.length) {
          handleNavigate(path[focusedIndex].position);
        }
        break;
      case 'Tab':
        // Close dropdown on Tab out
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, focusedIndex, path, handleNavigate, handleToggle]);

  // Focus option when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // ============================================================================
  // Styling - UX Spec Aligned (Story 7.9)
  // ============================================================================

  const isDark = theme === 'dark';

  // Icon-only button with transparent background for compact layout
  // Story 7.18 extension: Minimal footprint icons that can be packed together
  const buttonClasses = [
    'flex items-center justify-center p-2 rounded-lg',
    'w-10 h-10', // 40px touch target with transparent background
    'transition-all duration-200',
    // Transparent background with hover effect
    'bg-transparent',
    isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-200/50',
    isDark ? 'text-slate-300' : 'text-slate-600',
    // Focus styles
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white',
  ].join(' ');

  // Dropdown per UX spec: surface background, rounded-lg, shadow
  // Story 7.10: Use right-0 to prevent dropdown from being cut off at screen edge
  const dropdownClasses = [
    'absolute right-0 top-full mt-2 z-50',
    'min-w-[200px] p-2 rounded-xl',
    'shadow-lg',
    isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200',
  ].join(' ');

  // Dropdown item styling per UX spec (AC #5, #6)
  // Active level uses inline style for theme-aware accent color
  const getOptionClasses = (index: number, isCurrentLevel: boolean) => {
    const isFocused = focusedIndex === index;
    return [
      'w-full text-left px-4 py-2.5 flex items-center gap-2 rounded-lg',
      'min-h-11', // 44px touch target
      'transition-all duration-150',
      // Active level gets accent background and white text (AC #6)
      // Background color set via inline style for current level
      isCurrentLevel
        ? 'text-white font-semibold'
        : isDark
          ? 'text-slate-300 hover:bg-slate-700'
          : 'text-slate-600 hover:bg-slate-100',
      // Focus state
      isFocused && !isCurrentLevel && (isDark ? 'bg-slate-700' : 'bg-slate-100'),
      'focus:outline-none',
    ].filter(Boolean).join(' ');
  };

  // Get style for dropdown option (active level needs accent background)
  const getOptionStyle = (isCurrentLevel: boolean): React.CSSProperties => {
    if (isCurrentLevel) {
      return { backgroundColor: 'var(--accent)' };
    }
    return {};
  };

  // Level indicator styling (AC #5) - smaller, slightly muted
  const levelIndicatorClasses = isDark
    ? 'text-xs opacity-70 min-w-[80px]'
    : 'text-xs opacity-60 min-w-[80px]';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <nav
      ref={dropdownRef}
      className="relative w-full"
      role="navigation"
      aria-label="Category filter"
    >
      {/* Collapsed button - Story 7.18 extension: Icon-only with fixed height */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Category filter: ${currentLabel}`}
        className={buttonClasses}
      >
        {/* Icon uses CSS variable for theme-aware accent color */}
        <Tag size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent)' }} />
      </button>

      {/* Dropdown panel (AC #4, #5, #6, #8) */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Navigate to category level"
          className={dropdownClasses}
        >
          {path.map((item, index) => {
            const isCurrentLevel = index === path.length - 1;
            return (
              <button
                key={`${item.level}-${item.label}`}
                ref={(el) => { optionRefs.current[index] = el; }}
                role="option"
                aria-selected={isCurrentLevel}
                onClick={() => handleNavigate(item.position)}
                onKeyDown={handleKeyDown}
                className={getOptionClasses(index, isCurrentLevel)}
                style={getOptionStyle(isCurrentLevel)}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {/* Level indicator (AC #5) */}
                <span className={isCurrentLevel ? 'text-xs opacity-80 min-w-[80px]' : levelIndicatorClasses}>
                  {item.levelLabel}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export default CategoryBreadcrumb;
