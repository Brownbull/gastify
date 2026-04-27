/**
 * CategorySelectorOverlay Component
 *
 * Story 14.24: Full-screen category selector overlay
 *
 * Full-screen overlay for selecting categories (both transaction and item categories).
 * Similar to ImageViewer pattern - uses portal to render at document body level,
 * covers entire screen except navigation bar.
 *
 * Features:
 * - Full-screen overlay with semi-transparent background
 * - X button to cancel/close
 * - All categories displayed as clickable badges
 * - Search/filter functionality
 * - Scrollable content area
 * - Mobile-friendly touch targets (44px min)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import { translateStoreCategory, translateItemGroup, ITEM_GROUP_TRANSLATIONS, getItemCategoryEmoji, translateStoreCategoryGroup, translateItemCategoryGroup } from '@/utils/categoryTranslations';
import { getCategoryPillColors, getItemCategoryColors, STORE_CATEGORY_GROUPS, ITEM_CATEGORY_GROUPS, ITEM_CATEGORY_TO_KEY, STORE_GROUP_INFO, ITEM_GROUP_INFO, type StoreCategoryGroup, type ItemCategoryGroup } from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import type { Language } from '@/utils/translations';

/** Category with display info */
interface CategoryItem {
  value: string;
  label: string;
  emoji: string;
}

/** Group of categories */
interface CategoryGroup {
  key: string;
  name: string;
  emoji: string;
  categories: CategoryItem[];
}

interface CategorySelectorOverlayProps {
  /** Type of selector - 'store' for transaction categories, 'item' for item categories */
  type: 'store' | 'item';
  /** Currently selected category */
  value: string;
  /** Callback when a category is selected */
  onSelect: (category: string) => void;
  /** Callback to close the overlay */
  onClose: () => void;
  /** Available categories (for store type) */
  categories?: string[];
  /** Current language for translations */
  language: Language;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Title displayed at top */
  title?: string;
}

export const CategorySelectorOverlay: React.FC<CategorySelectorOverlayProps> = ({
  type,
  value,
  onSelect,
  onClose,
  categories = [],
  language,
  theme,
  title,
}) => {
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  // Get categories organized into groups
  const groupedCategories = useMemo((): CategoryGroup[] => {
    const locale = language === 'es' ? 'es' : 'en';

    if (type === 'store') {
      // Group store categories by their group
      const groupMap = new Map<StoreCategoryGroup, CategoryItem[]>();

      // Initialize groups in display order
      const groupOrder: StoreCategoryGroup[] = ['supermercados', 'restaurantes', 'comercio-barrio', 'vivienda', 'salud-bienestar', 'tiendas-generales', 'tiendas-especializadas', 'transporte-vehiculo', 'educacion', 'servicios-finanzas', 'entretenimiento-hospedaje', 'otros'];
      groupOrder.forEach(g => groupMap.set(g, []));

      // Populate groups
      categories.forEach(cat => {
        const groupKey = STORE_CATEGORY_GROUPS[cat as keyof typeof STORE_CATEGORY_GROUPS];
        if (groupKey && groupMap.has(groupKey)) {
          groupMap.get(groupKey)!.push({
            value: cat,
            label: translateStoreCategory(cat, language),
            emoji: getCategoryEmoji(cat),
          });
        }
      });

      // Sort categories alphabetically within each group and build result
      return groupOrder
        .filter(groupKey => groupMap.get(groupKey)!.length > 0)
        .map(groupKey => ({
          key: groupKey,
          name: translateStoreCategoryGroup(groupKey, language),
          emoji: STORE_GROUP_INFO[groupKey].emoji,
          categories: groupMap.get(groupKey)!.sort((a, b) =>
            a.label.localeCompare(b.label, locale)
          ),
        }));
    } else {
      // Group item categories by their group
      const groupMap = new Map<ItemCategoryGroup, CategoryItem[]>();

      // Initialize groups in display order
      const groupOrder: ItemCategoryGroup[] = ['food-fresh', 'food-packaged', 'food-prepared', 'salud-cuidado', 'hogar', 'productos-generales', 'servicios-cargos', 'vicios', 'otros-item'];
      groupOrder.forEach(g => groupMap.set(g, []));

      // Populate groups from ITEM_GROUP_TRANSLATIONS
      const itemCats = Object.keys(ITEM_GROUP_TRANSLATIONS);
      itemCats.forEach(cat => {
        const categoryKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
        if (categoryKey) {
          const groupKey = ITEM_CATEGORY_GROUPS[categoryKey];
          if (groupKey && groupMap.has(groupKey)) {
            groupMap.get(groupKey)!.push({
              value: cat,
              label: translateItemGroup(cat, language),
              emoji: getItemCategoryEmoji(cat),
            });
          }
        }
      });

      // Sort categories alphabetically within each group and build result
      return groupOrder
        .filter(groupKey => groupMap.get(groupKey)!.length > 0)
        .map(groupKey => ({
          key: groupKey,
          name: translateItemCategoryGroup(groupKey, language),
          emoji: ITEM_GROUP_INFO[groupKey].emoji,
          categories: groupMap.get(groupKey)!.sort((a, b) =>
            a.label.localeCompare(b.label, locale)
          ),
        }));
    }
  }, [type, categories, language]);

  // Flatten for search filtering (preserve original flat behavior for search)
  const allCategories = useMemo(() => {
    return groupedCategories.flatMap(g => g.categories);
  }, [groupedCategories]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return allCategories;
    const search = searchText.toLowerCase();
    return allCategories.filter(
      cat =>
        cat.label.toLowerCase().includes(search) ||
        cat.value.toLowerCase().includes(search)
    );
  }, [allCategories, searchText]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const handleSelect = (categoryValue: string) => {
    onSelect(categoryValue);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        // Cover content area but leave nav bar visible
        bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Select category'}
    >
      {/* Header with title and close button */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          borderColor: isDark ? '#334155' : '#e2e8f0',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
        }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
        >
          {title || (type === 'store' ? (language === 'es' ? 'Categoría' : 'Category') : (language === 'es' ? 'Categoría del Ítem' : 'Item Category'))}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      {/* Search input */}
      <div
        className="px-4 py-3 border-b"
        style={{
          borderColor: isDark ? '#334155' : '#e2e8f0',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <Search size={18} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="p-1 rounded-full"
              style={{ color: isDark ? '#64748b' : '#94a3b8' }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Categories grid - grouped when no search, flat when searching */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
      >
        {filteredCategories.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: isDark ? '#64748b' : '#94a3b8' }}
          >
            {language === 'es' ? 'Sin resultados' : 'No results'}
          </div>
        ) : searchText.trim() ? (
          /* Flat list when searching */
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map(cat => {
              const isSelected = cat.value === value;
              const colors = type === 'store'
                ? getCategoryPillColors(cat.value)
                : getItemCategoryColors(cat.value, 'normal', isDark ? 'dark' : 'light');

              return (
                <button
                  key={cat.value}
                  onClick={() => handleSelect(cat.value)}
                  className="rounded-full px-2.5 py-1.5 text-xs font-bold uppercase flex items-center gap-1 transition-all min-h-[36px]"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.fg,
                    outline: isSelected ? '2px solid var(--primary)' : 'none',
                    outlineOffset: '1px',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <span className="text-xs">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Grouped display when not searching */
          <div className="space-y-4">
            {groupedCategories.map(group => (
              <div key={group.key}>
                {/* Group header */}
                <div
                  className="flex items-center gap-2 mb-2 pb-1 border-b"
                  style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}
                >
                  <span className="text-base">{group.emoji}</span>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  >
                    {group.name}
                  </span>
                </div>
                {/* Categories in this group */}
                <div className="flex flex-wrap gap-2">
                  {group.categories.map(cat => {
                    const isSelected = cat.value === value;
                    const colors = type === 'store'
                      ? getCategoryPillColors(cat.value)
                      : getItemCategoryColors(cat.value, 'normal', isDark ? 'dark' : 'light');

                    return (
                      <button
                        key={cat.value}
                        onClick={() => handleSelect(cat.value)}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold uppercase flex items-center gap-1 transition-all min-h-[36px]"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.fg,
                          outline: isSelected ? '2px solid var(--primary)' : 'none',
                          outlineOffset: '1px',
                          transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        <span className="text-xs">{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
