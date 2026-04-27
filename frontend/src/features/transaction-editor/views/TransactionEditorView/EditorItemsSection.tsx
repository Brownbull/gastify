/**
 * EditorItemsSection — Item list with grouped and original order views
 *
 * Story 15-5d: Extracted from TransactionEditorViewInternal.tsx
 *
 * Renders items in two view modes:
 * - Grouped: items organized by category with collapsible groups
 * - Original: items in array index order (receipt line order)
 *
 * Supports editing, animation, cross-store suggestions, and read-only mode.
 */

import React from 'react';
import {
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
} from 'lucide-react';
import { CategoryBadge } from '@features/transaction-editor/components/CategoryBadge';
import { ItemNameSuggestionIndicator } from '@features/transaction-editor/components/ItemNameSuggestionIndicator';
import { AnimatedItem } from '@/components/AnimatedItem';
import { ItemViewToggle, type ItemViewMode } from '@/components/items/ItemViewToggle';
import { translateItemCategoryGroup, getItemCategoryGroupEmoji } from '@/utils/categoryTranslations';
import { getItemGroupColors } from '@/config/categoryColors';
import type { Transaction, TransactionItem } from '@/types/transaction';
import type { Language } from '@/utils/translations';
import { sanitizeInput } from '@/utils/sanitize';
import { deriveItemPrices } from '@entities/transaction/utils/itemPriceDerivation';
import { formatQty, shouldShowQty, sanitizeQtyInput, clampQtyOnBlur } from '@entities/transaction/utils/qtyUtils';
import type { SuggestionData } from './useCrossStoreSuggestions';

// ============================================================================
// Types
// ============================================================================

export interface ItemGroupData {
  groupKey: string;
  items: Array<{ item: TransactionItem; originalIndex: number }>;
  total: number;
}

export interface EditorItemsSectionProps {
  // View mode
  itemViewMode: ItemViewMode;
  onItemViewModeChange: (mode: ItemViewMode) => void;

  // Data
  itemsByGroup: ItemGroupData[];
  transaction: Transaction | null;

  // Animation
  shouldAnimate: boolean;
  animatedItems: TransactionItem[];
  animationPlayedRef: React.RefObject<boolean>;

  // Editing
  editingItemIndex: number | null;
  onEditingItemIndexChange: (index: number | null) => void;
  onUpdateItem: (index: number, field: string, value: unknown) => void;
  onDeleteItem: (index: number) => void;
  onAddItem: () => void;

  // Category overlay
  onShowItemCategoryOverlay: (index: number) => void;

  // Cross-store suggestions
  itemSuggestions: Map<number, SuggestionData>;
  onShowSuggestion: (itemIndex: number, item: TransactionItem) => void;

  // Display state
  readOnly: boolean;
  effectiveIsProcessing: boolean;
  isDark: boolean;
  inputStyle: React.CSSProperties;
  displayCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  lang: Language;
  t: (key: string) => string;
  theme: 'light' | 'dark';

  // Group collapse
  collapsedGroups: Set<string>;
  onToggleGroupCollapse: (groupKey: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function EditorItemsSection({
  itemViewMode,
  onItemViewModeChange,
  itemsByGroup,
  transaction,
  shouldAnimate,
  animatedItems,
  animationPlayedRef,
  editingItemIndex,
  onEditingItemIndexChange,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onShowItemCategoryOverlay,
  itemSuggestions,
  onShowSuggestion,
  readOnly,
  effectiveIsProcessing,
  isDark,
  inputStyle,
  displayCurrency,
  formatCurrency,
  lang,
  t,
  theme: _theme,
  collapsedGroups,
  onToggleGroupCollapse,
}: EditorItemsSectionProps) {
  return (
    <div className="mb-4">
      {/* Story 14.38: Full-width item view toggle (replaces "ÍTEMS" subtitle) */}
      {transaction?.items && transaction.items.length > 0 && (
        <div className="mb-3">
          <ItemViewToggle
            activeView={itemViewMode}
            onViewChange={onItemViewModeChange}
            t={t}
          />
        </div>
      )}

      <div className="space-y-3">
        {/* Grouped view - items organized by category */}
        {itemViewMode === 'grouped' && itemsByGroup.map(({ groupKey, items: groupItems, total: groupTotal }) => {
          const isCollapsed = collapsedGroups.has(groupKey);
          const groupColors = getItemGroupColors(groupKey as Parameters<typeof getItemGroupColors>[0], 'normal', isDark ? 'dark' : 'light');
          const groupEmoji = getItemCategoryGroupEmoji(groupKey);
          const translatedGroup = translateItemCategoryGroup(groupKey, lang);

          return (
            <div
              key={groupKey}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              {/* Group header */}
              <button
                onClick={() => onToggleGroupCollapse(groupKey)}
                className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
                style={{ backgroundColor: groupColors.bg }}
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{groupEmoji}</span>
                  <span className="text-sm font-semibold" style={{ color: groupColors.fg }}>
                    {translatedGroup}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: groupColors.fg }}
                  >
                    {groupItems.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: groupColors.fg }}>
                    {formatCurrency(groupTotal, displayCurrency)}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown size={16} style={{ color: groupColors.fg }} />
                  ) : (
                    <ChevronUp size={16} style={{ color: groupColors.fg }} />
                  )}
                </div>
              </button>

              {/* Items in group */}
              {!isCollapsed && (
                <div className="p-2 space-y-1.5">
                  {groupItems.map(({ item, originalIndex: i }) => {
                    const isVisible = !shouldAnimate || i < animatedItems.length;
                    const animationDelay = shouldAnimate ? i * 100 : 0;
                    const ItemContainer = shouldAnimate && !animationPlayedRef.current ? AnimatedItem : React.Fragment;
                    const containerProps = shouldAnimate && !animationPlayedRef.current
                      ? { delay: animationDelay, index: i, testId: `edit-view-item-${i}` }
                      : {};

                    if (!isVisible) return null;

                    return (
                      <ItemContainer key={i} {...containerProps}>
                        {editingItemIndex === i ? (
                          <GroupedItemEditView
                            item={item}
                            index={i}
                            inputStyle={inputStyle}
                            isDark={isDark}
                            lang={lang}
                            t={t}
                            onUpdateItem={onUpdateItem}
                            onDeleteItem={onDeleteItem}
                            onDoneEditing={() => onEditingItemIndexChange(null)}
                            onShowCategoryOverlay={() => onShowItemCategoryOverlay(i)}
                          />
                        ) : (
                          <ItemDisplayRow
                            item={item}
                            index={i}
                            readOnly={readOnly}
                            effectiveIsProcessing={effectiveIsProcessing}
                            displayCurrency={displayCurrency}
                            formatCurrency={formatCurrency}
                            lang={lang}
                            itemSuggestions={itemSuggestions}
                            onShowSuggestion={onShowSuggestion}
                            onStartEditing={() => onEditingItemIndexChange(i)}
                            theme={isDark ? 'dark' : 'light'}
                          />
                        )}
                      </ItemContainer>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Original order view - Story 14.38: items in array index order */}
        {itemViewMode === 'original' && transaction?.items && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {transaction.items.map((item, i) => {
                const isVisible = !shouldAnimate || i < animatedItems.length;
                const animationDelay = shouldAnimate ? i * 100 : 0;
                const ItemContainer = shouldAnimate && !animationPlayedRef.current ? AnimatedItem : React.Fragment;
                const containerProps = shouldAnimate && !animationPlayedRef.current
                  ? { delay: animationDelay, index: i, testId: `edit-view-item-original-${i}` }
                  : {};

                if (!isVisible) return null;

                return (
                  <ItemContainer key={i} {...containerProps}>
                    <div
                      className="px-3 py-2.5 transition-colors"
                      style={{
                        backgroundColor: i % 2 === 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      }}
                    >
                      {editingItemIndex === i ? (
                        <OriginalItemEditView
                          item={item}
                          index={i}
                          inputStyle={inputStyle}
                          isDark={isDark}
                          lang={lang}
                          t={t}
                          onUpdateItem={onUpdateItem}
                          onDeleteItem={onDeleteItem}
                          onDoneEditing={() => onEditingItemIndexChange(null)}
                          onShowCategoryOverlay={() => {
                            onShowItemCategoryOverlay(i);
                            onEditingItemIndexChange(null);
                          }}
                        />
                      ) : (
                        <OriginalItemDisplayRow
                          item={item}
                          index={i}
                          readOnly={readOnly}
                          effectiveIsProcessing={effectiveIsProcessing}
                          displayCurrency={displayCurrency}
                          formatCurrency={formatCurrency}
                          lang={lang}
                          itemSuggestions={itemSuggestions}
                          onShowSuggestion={onShowSuggestion}
                          onStartEditing={() => onEditingItemIndexChange(i)}
                          theme={isDark ? 'dark' : 'light'}
                        />
                      )}
                    </div>
                  </ItemContainer>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Item button - Story 14.24: hidden in read-only mode */}
      {!readOnly && (
        <button
          onClick={onAddItem}
          disabled={effectiveIsProcessing}
          className="w-full p-2.5 mt-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-1.5 transition-colors"
          style={{
            borderColor: 'var(--border-light)',
            color: 'var(--primary)',
            backgroundColor: 'transparent',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span className="text-sm font-medium">{t('addItem')}</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components (grouped view)
// ============================================================================

interface GroupedItemEditViewProps {
  item: TransactionItem;
  index: number;
  inputStyle: React.CSSProperties;
  isDark: boolean;
  lang: Language;
  t: (key: string) => string;
  onUpdateItem: (index: number, field: string, value: unknown) => void;
  onDeleteItem: (index: number) => void;
  onDoneEditing: () => void;
  onShowCategoryOverlay: () => void;
}

function GroupedItemEditView({
  item,
  index: i,
  inputStyle,
  isDark,
  lang,
  t,
  onUpdateItem,
  onDeleteItem,
  onDoneEditing,
  onShowCategoryOverlay,
}: GroupedItemEditViewProps) {
  const derivedUnitPrice = deriveItemPrices(item).unitPrice;
  return (
    <div
      className="p-2.5 rounded-lg space-y-1.5"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      {/* Item name */}
      <input
        className="w-full px-2 py-1.5 border rounded-lg text-xs"
        style={inputStyle}
        value={item.name}
        onChange={e => onUpdateItem(i, 'name', sanitizeInput(e.target.value, { maxLength: 100 }))}
        placeholder={t('itemName')}
        autoFocus
      />
      {/* Price + derived unitPrice - Story 14.24 + 18-8 + TD-18-13 */}
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          inputMode="decimal"
          className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
          style={inputStyle}
          defaultValue={item.totalPrice || ''}
          key={`totalPrice-${i}`}
          onFocus={e => e.target.select()}
          onChange={e => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, '');
            const parts = cleaned.split('.');
            const sanitized = parts.length > 2
              ? parts[0] + '.' + parts.slice(1).join('')
              : cleaned;
            if (sanitized !== e.target.value) {
              e.target.value = sanitized;
            }
          }}
          onBlur={e => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
              onUpdateItem(i, 'totalPrice', val);
              e.target.value = String(val);
            } else {
              onUpdateItem(i, 'totalPrice', 0);
              e.target.value = '0';
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder={t('price')}
        />
        <span
          className="w-24 px-2 py-1.5 text-xs text-right truncate"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label={`${t('unitPrice')}: ${derivedUnitPrice}`}
          title={t('unitPrice')}
        >
          {t('unitPrice')}: {derivedUnitPrice}
        </span>
      </div>
      {/* Story 14.24: Category pill and quantity in same row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onShowCategoryOverlay}
          className="flex-1 min-w-0"
        >
          <CategoryBadge
            category={item.category || 'Other'}
            lang={lang}
            showIcon
            mini
            type="item"
          />
        </button>
        {/* Quantity field (decimal supported) — TD-18-14 */}
        <input
          type="text"
          inputMode="decimal"
          className="w-16 min-h-10 px-2 py-1.5 border rounded-lg text-xs text-center"
          style={inputStyle}
          defaultValue={item.qty ?? 1}
          key={`qty-${i}`}
          aria-label={t('qty')}
          onFocus={e => e.target.select()}
          onChange={e => {
            const cleaned = sanitizeQtyInput(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
          }}
          onBlur={e => {
            const val = clampQtyOnBlur(e.target.value);
            onUpdateItem(i, 'qty', val);
            e.target.value = String(val);
          }}
          onKeyDown={e => {
            if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
              e.preventDefault();
            }
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder={t('qty')}
        />
      </div>
      {/* Subcategory */}
      <input
        className="w-full px-2 py-1.5 border rounded-lg text-xs"
        style={inputStyle}
        value={item.subcategory || ''}
        onChange={e => onUpdateItem(i, 'subcategory', sanitizeInput(e.target.value, { maxLength: 50 }))}
        placeholder={t('itemSubcat')}
      />
      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-0.5">
        <button
          onClick={() => onDeleteItem(i)}
          className="min-w-10 min-h-10 p-1.5 rounded-lg flex items-center justify-center"
          style={{
            color: 'var(--error)',
            backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          }}
          aria-label={t('deleteItem')}
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
        <button
          onClick={onDoneEditing}
          className="min-w-10 min-h-10 p-1.5 rounded-lg flex items-center justify-center"
          style={{
            color: 'var(--success)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          }}
          aria-label={t('confirmItem')}
        >
          <Check size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components (shared display row)
// ============================================================================

interface ItemDisplayRowProps {
  item: TransactionItem;
  index: number;
  readOnly: boolean;
  effectiveIsProcessing: boolean;
  displayCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
  lang: Language;
  itemSuggestions: Map<number, SuggestionData>;
  onShowSuggestion: (itemIndex: number, item: TransactionItem) => void;
  onStartEditing: () => void;
  theme: 'light' | 'dark';
}

function ItemDisplayRow({
  item,
  index: i,
  readOnly,
  effectiveIsProcessing,
  displayCurrency,
  formatCurrency,
  lang,
  itemSuggestions,
  onShowSuggestion,
  onStartEditing,
  theme,
}: ItemDisplayRowProps) {
  return (
    <div
      onClick={() => !effectiveIsProcessing && !readOnly && onStartEditing()}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={e => { if (!readOnly && !effectiveIsProcessing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onStartEditing(); } }}
      className={`px-2.5 py-2 rounded-lg transition-colors ${readOnly ? '' : 'cursor-pointer'}`}
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.name}
          </span>
          {!readOnly && itemSuggestions.has(i) && (
            <ItemNameSuggestionIndicator
              suggestedName={itemSuggestions.get(i)!.suggestedName}
              fromStore={itemSuggestions.get(i)!.fromMerchant}
              onClick={() => onShowSuggestion(i, item)}
              theme={theme}
            />
          )}
          {!readOnly && <Pencil size={10} style={{ color: 'var(--text-tertiary)', opacity: 0.6, flexShrink: 0 }} />}
        </div>
        <span
          className="text-xs font-semibold flex-shrink-0"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatCurrency(item.totalPrice, displayCurrency)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap items-center gap-1">
          <CategoryBadge category={item.category || 'Other'} lang={lang} mini type="item" />
          {item.subcategory && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-tertiary)',
              }}
            >
              {item.subcategory}
            </span>
          )}
        </div>
        {shouldShowQty(item.qty) && (
          <span
            className="text-xs font-medium flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {item.unitPrice
              ? `${formatCurrency(item.unitPrice, displayCurrency)} x${formatQty(item.qty)}`
              : `x${formatQty(item.qty)}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components (original order)
// ============================================================================

interface OriginalItemEditViewProps {
  item: TransactionItem;
  index: number;
  inputStyle: React.CSSProperties;
  isDark: boolean;
  lang: Language;
  t: (key: string) => string;
  onUpdateItem: (index: number, field: string, value: unknown) => void;
  onDeleteItem: (index: number) => void;
  onDoneEditing: () => void;
  onShowCategoryOverlay: () => void;
}

function OriginalItemEditView({
  item,
  index: i,
  inputStyle,
  isDark,
  lang,
  t,
  onUpdateItem,
  onDeleteItem,
  onDoneEditing,
  onShowCategoryOverlay,
}: OriginalItemEditViewProps) {
  const derivedUnitPrice = deriveItemPrices(item).unitPrice;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium w-5 text-center flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {i + 1}.
        </span>
        <input
          className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
          style={inputStyle}
          value={item.name}
          onChange={e => onUpdateItem(i, 'name', sanitizeInput(e.target.value, { maxLength: 100 }))}
          placeholder={t('itemName')}
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 pl-7">
        <input
          type="text"
          inputMode="decimal"
          className="w-24 px-2 py-1.5 border rounded-lg text-xs"
          style={inputStyle}
          defaultValue={item.totalPrice || ''}
          key={`totalPrice-original-${i}`}
          onFocus={e => e.target.select()}
          onChange={e => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, '');
            const parts = cleaned.split('.');
            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
            if (sanitized !== e.target.value) e.target.value = sanitized;
          }}
          onBlur={e => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0) {
              onUpdateItem(i, 'totalPrice', val);
            } else {
              onUpdateItem(i, 'totalPrice', 0);
              e.target.value = '0';
            }
          }}
          placeholder={t('itemPrice')}
        />
        {/* TD-18-14: qty input (decimal supported) */}
        <input
          type="text"
          inputMode="decimal"
          className="w-16 min-h-10 px-1.5 py-1.5 border rounded-lg text-xs text-center"
          style={inputStyle}
          defaultValue={item.qty ?? 1}
          key={`qty-original-${i}`}
          aria-label={t('qty')}
          onFocus={e => e.target.select()}
          onChange={e => {
            const cleaned = sanitizeQtyInput(e.target.value);
            if (cleaned !== e.target.value) e.target.value = cleaned;
          }}
          onBlur={e => {
            const val = clampQtyOnBlur(e.target.value);
            onUpdateItem(i, 'qty', val);
            e.target.value = String(val);
          }}
          onKeyDown={e => {
            if (e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') {
              e.preventDefault();
            }
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder={t('qty')}
        />
        {/* TD-18-13: derived unitPrice (read-only) */}
        <span className="w-16 text-xs text-right truncate" style={{ color: 'var(--text-tertiary)' }} aria-label={`${t('unitPrice')}: ${derivedUnitPrice}`}>
          {t('unitPrice')}: {derivedUnitPrice}
        </span>
        <button
          onClick={onShowCategoryOverlay}
          className="px-2 py-1 rounded-lg text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <CategoryBadge category={item.category || 'Other'} lang={lang} mini type="item" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onDeleteItem(i)}
          className="min-w-8 min-h-8 p-1 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--error)', backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
          aria-label={t('deleteItem')}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
        <button
          onClick={onDoneEditing}
          className="min-w-8 min-h-8 p-1 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--success)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          aria-label={t('confirmItem')}
        >
          <Check size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function OriginalItemDisplayRow({
  item,
  index: i,
  readOnly,
  effectiveIsProcessing,
  displayCurrency,
  formatCurrency,
  lang,
  itemSuggestions,
  onShowSuggestion,
  onStartEditing,
  theme,
}: ItemDisplayRowProps) {
  return (
    <div
      onClick={() => !effectiveIsProcessing && !readOnly && onStartEditing()}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={e => { if (!readOnly && !effectiveIsProcessing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onStartEditing(); } }}
      className={`flex items-center gap-2 ${readOnly ? '' : 'cursor-pointer'}`}
    >
      <span
        className="text-xs font-medium w-5 text-center flex-shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {i + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span
              className="text-xs font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {item.name}
            </span>
            {!readOnly && itemSuggestions.has(i) && (
              <ItemNameSuggestionIndicator
                suggestedName={itemSuggestions.get(i)!.suggestedName}
                fromStore={itemSuggestions.get(i)!.fromMerchant}
                onClick={() => onShowSuggestion(i, item)}
                theme={theme}
              />
            )}
            {!readOnly && <Pencil size={10} style={{ color: 'var(--text-tertiary)', opacity: 0.6, flexShrink: 0 }} />}
          </div>
          <span
            className="text-xs font-semibold flex-shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatCurrency(item.totalPrice, displayCurrency)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <CategoryBadge category={item.category || 'Other'} lang={lang} mini type="item" />
          {item.subcategory && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
            >
              {item.subcategory}
            </span>
          )}
          {shouldShowQty(item.qty) && (
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {item.unitPrice
                ? `${formatCurrency(item.unitPrice, displayCurrency)} x${formatQty(item.qty)}`
                : `x${formatQty(item.qty)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
