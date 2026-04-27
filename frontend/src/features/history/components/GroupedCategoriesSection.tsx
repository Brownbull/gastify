/**
 * GroupedCategoriesSection — Generic grouped category component with config-driven variants
 *
 * Story 15b-2p: Extracted from IconCategoryFilter.tsx
 * Story TD-15b-25: Consolidated Store/Item variants into single generic component
 *
 * Both store and item variants follow the same expand/collapse group pattern
 * with multi-select checkboxes. Config object provides variant-specific functions.
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import {
  getCategoryBackgroundAuto,
  getStoreGroupColors,
  getItemGroupColors,
  ALL_STORE_CATEGORY_GROUPS,
  ALL_ITEM_CATEGORY_GROUPS,
  expandStoreCategoryGroup,
  expandItemCategoryGroup,
  getCurrentTheme,
  getCurrentMode,
  type StoreCategoryGroup,
  type ItemCategoryGroup,
} from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import {
  translateStoreCategory,
  translateItemGroup,
  translateStoreCategoryGroup,
  translateItemCategoryGroup,
  getStoreCategoryGroupEmoji,
  getItemCategoryGroupEmoji,
} from '@/utils/categoryTranslations';
import type { Language } from '@/utils/translations';

// ============================================================================
// Shared helper (private — not exported)
// ============================================================================

function toSentenceCase(str: string): string {
  if (!str) return str;
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// Config + Generic Component
// ============================================================================

const EMOJI_BG = 'rgba(255,255,255,0.6)';
const UNSELECTED_BG = 'rgba(255,255,255,0.5)';

interface GroupColors {
  bg: string;
  fg: string;
  border?: string;
}

export interface GroupedCategoriesSectionConfig<TGroup extends string> {
  groups: readonly TGroup[];
  expandGroup: (group: TGroup) => string[];
  getGroupColors: (group: TGroup) => GroupColors;
  getGroupEmoji: (group: TGroup) => string;
  translateGroup: (group: TGroup, lang: Language) => string;
  translateCategory: (category: string, lang: Language) => string;
}

export interface GroupedCategoriesSectionProps<TGroup extends string> {
  config: GroupedCategoriesSectionConfig<TGroup>;
  selectedCategories: Set<string>;
  onCategoryToggle: (category: string) => void;
  onGroupToggle: (group: TGroup, categories: string[], isCurrentlySelected: boolean) => void;
  lang: Language;
}

export function GroupedCategoriesSection<TGroup extends string>({
  config,
  selectedCategories,
  onCategoryToggle,
  onGroupToggle,
  lang,
}: GroupedCategoriesSectionProps<TGroup>): React.ReactElement {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(config.groups)
  );

  const toggleGroupExpansion = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {config.groups.map((group) => {
        const groupCategories = config.expandGroup(group);
        const groupColors = config.getGroupColors(group);
        const isExpanded = expandedGroups.has(group);

        const selectedInGroup = groupCategories.filter(cat => selectedCategories.has(cat));
        const allSelected = selectedInGroup.length === groupCategories.length;
        const someSelected = selectedInGroup.length > 0 && !allSelected;

        return (
          <div
            key={group}
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: groupColors.bg }}
          >
            {/* Group Header */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              style={{ borderLeft: `4px solid ${groupColors.border || groupColors.fg}` }}
              onClick={() => toggleGroupExpansion(group)}
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: EMOJI_BG }}
              >
                {config.getGroupEmoji(group)}
              </span>
              <span
                className="text-sm font-semibold flex-1"
                style={{ color: groupColors.fg }}
              >
                {toSentenceCase(config.translateGroup(group, lang))}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroupToggle(group, groupCategories, allSelected);
                }}
                aria-label={`Toggle ${group}`}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  backgroundColor: allSelected
                    ? 'var(--primary)'
                    : someSelected
                      ? 'var(--warning, #f59e0b)'
                      : 'white',
                  border: allSelected || someSelected ? 'none' : '2px solid var(--border-medium)',
                }}
              >
                {(allSelected || someSelected) && (
                  <Check size={14} strokeWidth={3} color="white" />
                )}
              </button>
            </div>

            {/* Category Items */}
            {isExpanded && (
              <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
                {groupCategories.map((category) => {
                  const isSelected = selectedCategories.has(category);
                  const categoryColor = getCategoryBackgroundAuto(category);

                  return (
                    <button
                      key={category}
                      onClick={() => onCategoryToggle(category)}
                      className="flex items-center gap-2 p-2 rounded-lg transition-colors text-left"
                      style={{
                        backgroundColor: isSelected ? categoryColor : 'rgba(255,255,255,0.5)',
                        border: isSelected ? `2px solid ${groupColors.fg}` : '2px solid transparent',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: isSelected ? UNSELECTED_BG : categoryColor }}
                      >
                        {getCategoryEmoji(category)}
                      </span>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {config.translateCategory(category, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Pre-built configs for Store and Item variants
// ============================================================================

export const storeGroupConfig: GroupedCategoriesSectionConfig<StoreCategoryGroup> = {
  groups: ALL_STORE_CATEGORY_GROUPS,
  expandGroup: expandStoreCategoryGroup,
  getGroupColors: (group) => getStoreGroupColors(group, getCurrentTheme(), getCurrentMode()),
  getGroupEmoji: getStoreCategoryGroupEmoji,
  translateGroup: translateStoreCategoryGroup,
  translateCategory: translateStoreCategory,
};

export const itemGroupConfig: GroupedCategoriesSectionConfig<ItemCategoryGroup> = {
  groups: ALL_ITEM_CATEGORY_GROUPS,
  expandGroup: expandItemCategoryGroup,
  getGroupColors: (group) => getItemGroupColors(group, getCurrentTheme(), getCurrentMode()),
  getGroupEmoji: getItemCategoryGroupEmoji,
  translateGroup: translateItemCategoryGroup,
  translateCategory: translateItemGroup,
};
