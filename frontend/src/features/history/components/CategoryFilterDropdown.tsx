/**
 * CategoryFilterDropdown Component
 *
 * Hierarchical dropdown for filtering transactions by category.
 * Levels: All Categories → Store Category → Item Group → Subcategory
 *
 * Story 9.19: History Transaction Filters (AC #3)
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, ChevronLeft } from 'lucide-react';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import type { CategoryFilterState } from '@/types/historyFilters';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
// Story 9.12: Category translations
import { translateCategory } from '@/utils/categoryTranslations';
import type { Language } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

type NavigationLevel = 'root' | 'category' | 'group';

interface CategoryFilterDropdownProps {
  /** Available filters extracted from transactions */
  availableFilters: AvailableFilters;
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for translations (en/es) */
  locale?: string;
  /** Translation function */
  t: (key: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export function CategoryFilterDropdown({
  availableFilters,
  theme = 'light',
  locale = 'en',
  t,
}: CategoryFilterDropdownProps): React.ReactElement {
  const { category, dispatch } = useHistoryFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [navLevel, setNavLevel] = useState<NavigationLevel>('root');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isDark = theme === 'dark';
  const lang = (locale === 'es' ? 'es' : 'en') as Language;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        resetNavigation();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        resetNavigation();
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const resetNavigation = useCallback(() => {
    setNavLevel('root');
    setSelectedCategory(null);
    setSelectedGroup(null);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      if (prev) {
        resetNavigation();
      }
      return !prev;
    });
  }, [resetNavigation]);

  // Apply filter and close
  const applyFilter = useCallback((filter: CategoryFilterState) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: filter });
    setIsOpen(false);
    resetNavigation();
    buttonRef.current?.focus();
  }, [dispatch, resetNavigation]);

  // Handle "All Categories" selection
  const handleAllCategories = useCallback(() => {
    applyFilter({ level: 'all' });
  }, [applyFilter]);

  // Handle store category selection (drill down)
  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setNavLevel('category');
  }, []);

  // Handle item group selection (drill down)
  const handleGroupSelect = useCallback((group: string) => {
    setSelectedGroup(group);
    setNavLevel('group');
  }, []);

  // Apply category filter (select current level)
  const handleApplyCategory = useCallback(() => {
    if (!selectedCategory) return;
    applyFilter({ level: 'category', category: selectedCategory });
  }, [selectedCategory, applyFilter]);

  // Apply group filter
  const handleApplyGroup = useCallback(() => {
    if (!selectedCategory || !selectedGroup) return;
    applyFilter({
      level: 'group',
      category: selectedCategory,
      group: selectedGroup,
    });
  }, [selectedCategory, selectedGroup, applyFilter]);

  // Apply subcategory filter
  const handleSubcategorySelect = useCallback((subcategory: string) => {
    if (!selectedCategory || !selectedGroup) return;
    applyFilter({
      level: 'subcategory',
      category: selectedCategory,
      group: selectedGroup,
      subcategory,
    });
  }, [selectedCategory, selectedGroup, applyFilter]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (navLevel) {
      case 'category':
        setNavLevel('root');
        setSelectedCategory(null);
        break;
      case 'group':
        setNavLevel('category');
        setSelectedGroup(null);
        break;
    }
  }, [navLevel]);

  // Get current filter label for button (AC #3: translated)
  const getButtonLabel = (): string => {
    if (category.level === 'all') return t('allCategories');
    if (category.subcategory) return translateCategory(category.subcategory, lang);
    if (category.group) return translateCategory(category.group, lang);
    if (category.category) return translateCategory(category.category, lang);
    return t('allCategories');
  };

  // ============================================================================
  // Styling
  // ============================================================================

  const buttonClasses = [
    'flex items-center gap-2 px-3 py-2 rounded-lg',
    'min-h-11', // 44px touch target (AC #6)
    'transition-all duration-200',
    isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100',
    isDark ? 'border-slate-700' : 'border-slate-200',
    'border',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    isDark ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white',
  ].join(' ');

  const dropdownClasses = [
    'absolute left-0 top-full mt-2 z-50',
    'min-w-[220px] max-w-[280px] max-h-[300px] overflow-y-auto p-2 rounded-xl',
    'shadow-lg',
    isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200',
  ].join(' ');

  const optionClasses = (isActive: boolean = false) => [
    'w-full text-left px-4 py-2.5 rounded-lg',
    'min-h-11', // 44px touch target (AC #6)
    'transition-all duration-150',
    'flex items-center justify-between',
    isActive
      ? 'text-white font-semibold'
      : isDark
        ? 'text-slate-300 hover:bg-slate-700'
        : 'text-slate-600 hover:bg-slate-100',
    'focus:outline-none',
  ].join(' ');

  const optionStyle = (isActive: boolean = false): React.CSSProperties => {
    if (isActive) {
      return { backgroundColor: 'var(--accent)' };
    }
    return {};
  };

  const backButtonClasses = [
    'flex items-center gap-1 px-2 py-1.5 rounded-lg mb-2',
    'text-sm',
    isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100',
  ].join(' ');

  // ============================================================================
  // Render
  // ============================================================================

  const renderContent = () => {
    switch (navLevel) {
      case 'root':
        return (
          <>
            {/* All Categories option */}
            <button
              onClick={handleAllCategories}
              className={optionClasses(category.level === 'all')}
              style={optionStyle(category.level === 'all')}
            >
              {t('allCategories')}
            </button>
            {/* Store categories */}
            {availableFilters.categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={optionClasses(
                  category.category === cat && category.level === 'category'
                )}
                style={optionStyle(
                  category.category === cat && category.level === 'category'
                )}
              >
                <span>{translateCategory(cat, lang)}</span>
                {availableFilters.groupsByCategory[cat]?.length > 0 && (
                  <span className="text-xs opacity-60">{'>'}</span>
                )}
              </button>
            ))}
          </>
        );

      case 'category':
        if (!selectedCategory) return null;
        const groups = availableFilters.groupsByCategory[selectedCategory] || [];
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this category option */}
            <button
              onClick={handleApplyCategory}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectCategory')}: {translateCategory(selectedCategory, lang)}
            </button>
            {groups.length > 0 && (
              <>
                <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                {/* Item groups */}
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => handleGroupSelect(group)}
                    className={optionClasses(
                      category.group === group && category.level === 'group'
                    )}
                    style={optionStyle(
                      category.group === group && category.level === 'group'
                    )}
                  >
                    <span>{translateCategory(group, lang)}</span>
                    {availableFilters.subcategoriesByGroup[group]?.length > 0 && (
                      <span className="text-xs opacity-60">{'>'}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </>
        );

      case 'group':
        if (!selectedGroup) return null;
        const subcategories = availableFilters.subcategoriesByGroup[selectedGroup] || [];
        return (
          <>
            <button onClick={handleBack} className={backButtonClasses}>
              <ChevronLeft size={16} />
              {t('back')}
            </button>
            {/* Select this group option */}
            <button
              onClick={handleApplyGroup}
              className={optionClasses()}
              style={{ color: 'var(--accent)' }}
            >
              {t('selectGroup')}: {translateCategory(selectedGroup, lang)}
            </button>
            {subcategories.length > 0 && (
              <>
                <div className="border-t my-1" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                {/* Subcategories */}
                {subcategories.map(subcat => (
                  <button
                    key={subcat}
                    onClick={() => handleSubcategorySelect(subcat)}
                    className={optionClasses(
                      category.subcategory === subcat && category.level === 'subcategory'
                    )}
                    style={optionStyle(
                      category.subcategory === subcat && category.level === 'subcategory'
                    )}
                  >
                    {translateCategory(subcat, lang)}
                  </button>
                ))}
              </>
            )}
          </>
        );
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${t('filterByCategory')}: ${getButtonLabel()}`}
        className={buttonClasses}
        style={{ color: 'var(--primary)' }}
      >
        <Tag size={18} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <span className="text-sm truncate max-w-[100px]">{getButtonLabel()}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('filterByCategory')}
          className={dropdownClasses}
        >
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export default CategoryFilterDropdown;
