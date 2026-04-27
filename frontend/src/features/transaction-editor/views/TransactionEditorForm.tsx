/**
 * TransactionEditorForm — Presentational form component
 * Story 16-5: Extracted from TransactionEditorViewInternal.tsx
 */
import React, { useState, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, BookMarked, Pencil, Layers } from 'lucide-react';
import { CategoryBadge } from '@features/transaction-editor/components/CategoryBadge';
import { CategorySelectorOverlay } from '@features/transaction-editor/components/CategorySelectorOverlay';
import { LocationSelect } from '@/components/LocationSelect';
import { DateTimeTag } from '@features/transaction-editor/components/DateTimeTag';
import { CurrencyTag } from '@features/transaction-editor/components/CurrencyTag';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import { EditorItemsSection, type ItemGroupData } from './TransactionEditorView/EditorItemsSection';
import { EditorScanThumbnail } from './TransactionEditorView/EditorScanThumbnail';
import type { SuggestionData } from './TransactionEditorView/useCrossStoreSuggestions';
import type { Transaction, TransactionItem } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';
import type { ScanButtonState } from './TransactionEditorView/editorViewTypes';
import type { Language } from '@/utils/translations';
import type { ItemViewMode } from '@/components/items/ItemViewToggle';

export interface TransactionEditorFormProps {
  transaction: Transaction | null;
  displayTransaction: Transaction;
  mode: 'new' | 'existing';
  readOnly: boolean;
  isOtherUserTransaction: boolean;
  ownerProfile?: { displayName?: string; photoURL?: string | null } | null;
  calculatedTotal: number;
  canSave: boolean;
  displayCurrency: string;
  effectiveIsProcessing: boolean;
  displayImageUrl: string | undefined;
  pendingImageUrl: string | undefined;
  hasImages: boolean;
  scanButtonState: ScanButtonState;
  hasCredits: boolean;
  isRescanning: boolean;
  prefersReducedMotion: boolean;
  editingItemIndex: number | null;
  onEditingItemIndexChange: (index: number | null) => void;
  itemViewMode: ItemViewMode;
  onItemViewModeChange: (mode: ItemViewMode) => void;
  collapsedGroups: Set<string>;
  onToggleGroupCollapse: (groupKey: string) => void;
  itemsByGroup: ItemGroupData[];
  shouldAnimate: boolean;
  animatedItems: TransactionItem[];
  animationPlayedRef: React.RefObject<boolean>;
  itemSuggestions: Map<number, SuggestionData>;
  onUpdateTransaction: (transaction: Transaction) => void;
  onUpdateItem: (index: number, field: string, value: unknown) => void;
  onDeleteItem: (index: number) => void;
  onAddItem: () => void;
  onShowSuggestion: (itemIndex: number, item: TransactionItem) => void;
  onOpenFilePicker: () => void;
  onRetry: () => void;
  onProcessScan: () => void;
  onRescanClick: () => void;
  onRescan?: () => Promise<void>;
  onRequestEdit?: () => void;
  onShowImageViewer: () => void;
  onBatchModeClick?: () => void;
  onSaveWithLearning: () => Promise<void>;
  isSaving: boolean;
  theme: 'light' | 'dark';
  isDark: boolean;
  inputStyle: React.CSSProperties;
  t: (key: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
  lang: Language;
  storeCategories: string[];
  defaultCountry: string;
}

export function TransactionEditorForm(props: TransactionEditorFormProps) {
  const {
    transaction, displayTransaction, mode, readOnly, isOtherUserTransaction, ownerProfile,
    calculatedTotal, canSave, displayCurrency, effectiveIsProcessing,
    displayImageUrl, pendingImageUrl, hasImages, scanButtonState, hasCredits,
    isRescanning, prefersReducedMotion,
    editingItemIndex, onEditingItemIndexChange, itemViewMode, onItemViewModeChange,
    collapsedGroups, onToggleGroupCollapse,
    itemsByGroup, shouldAnimate, animatedItems, animationPlayedRef, itemSuggestions,
    onUpdateTransaction, onUpdateItem, onDeleteItem, onAddItem, onShowSuggestion,
    onOpenFilePicker, onRetry, onProcessScan, onRescanClick, onRescan,
    onRequestEdit, onShowImageViewer, onBatchModeClick,
    onSaveWithLearning, isSaving,
    theme, isDark, inputStyle, t, formatCurrency, lang, storeCategories, defaultCountry,
  } = props;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showItemCategoryOverlay, setShowItemCategoryOverlay] = useState<number | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const merchantDisplay = displayTransaction.alias || displayTransaction.merchant || t('merchantPlaceholder');

  return (
    <>
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-light)' }}>
        <div className="flex justify-between items-start gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex-1 min-w-0">
            {isEditingTitle && !readOnly ? (
              <input ref={titleInputRef} type="text" value={displayTransaction.alias || ''}
                onChange={e => transaction && onUpdateTransaction({ ...transaction, alias: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                placeholder={displayTransaction.merchant || t('merchantPlaceholder')}
                className="text-xl font-bold w-full bg-transparent border-none outline-none mb-2"
                style={{ color: 'var(--text-primary)' }} autoFocus disabled={effectiveIsProcessing} />
            ) : readOnly ? (
              <div className="mb-2">
                <span className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}
                  title={displayTransaction.alias || displayTransaction.merchant || t('newTransaction')}>
                  {merchantDisplay}
                </span>
              </div>
            ) : (
              <button onClick={() => { if (!effectiveIsProcessing) { setIsEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); } }}
                className="flex items-center gap-2 mb-2 text-left w-full group" disabled={effectiveIsProcessing}>
                <span className="text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}
                  title={displayTransaction.alias || displayTransaction.merchant || t('newTransaction')}>
                  {merchantDisplay}
                </span>
                <Pencil size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
              </button>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-2 relative">
              {readOnly ? (
                <CategoryBadge category={displayTransaction.category || 'Other'} lang={lang} showIcon maxWidth="120px" />
              ) : (
                <button onClick={() => !effectiveIsProcessing && setShowCategoryDropdown(!showCategoryDropdown)}
                  className="cursor-pointer" disabled={effectiveIsProcessing}>
                  <CategoryBadge category={displayTransaction.category || 'Other'} lang={lang} showIcon maxWidth="120px" />
                </button>
              )}
              {showCategoryDropdown && (
                <CategorySelectorOverlay type="store" value={displayTransaction.category || 'Other'}
                  onSelect={cat => { if (transaction) onUpdateTransaction({ ...transaction, category: cat as StoreCategory }); }}
                  onClose={() => setShowCategoryDropdown(false)} categories={storeCategories} language={lang} theme={theme} title={t('category')} />
              )}
              {displayTransaction.merchantSource === 'learned' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe', color: isDark ? '#93c5fd' : '#1d4ed8', border: '1px solid', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#93c5fd' }}>
                  <BookMarked size={10} />{t('learnedMerchant')}
                </span>
              )}
            </div>

            <LocationSelect country={displayTransaction.country || ''} city={displayTransaction.city || ''}
              onCountryChange={country => transaction && onUpdateTransaction({ ...transaction, country })}
              onCityChange={city => transaction && onUpdateTransaction({ ...transaction, city })}
              inputStyle={inputStyle} theme={theme} t={t} lang={lang} userDefaultCountry={defaultCountry} disabled={readOnly} />

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <DateTimeTag date={displayTransaction.date} time={displayTransaction.time || ''}
                onDateChange={date => transaction && onUpdateTransaction({ ...transaction, date })}
                onTimeChange={time => transaction && onUpdateTransaction({ ...transaction, time })} t={t} disabled={readOnly} />
              <CurrencyTag currency={displayTransaction.currency || DEFAULT_CURRENCY}
                onCurrencyChange={c => transaction && onUpdateTransaction({ ...transaction, currency: c })} t={t} disabled={readOnly} />
            </div>
          </div>

          <EditorScanThumbnail scanButtonState={scanButtonState} effectiveIsProcessing={effectiveIsProcessing}
            hasCredits={hasCredits} prefersReducedMotion={prefersReducedMotion} displayImageUrl={displayImageUrl}
            pendingImageUrl={pendingImageUrl} mode={mode} transactionThumbnailUrl={transaction?.thumbnailUrl}
            transactionId={transaction?.id} displayCategory={displayTransaction.category || 'Other'}
            hasImages={hasImages} isOtherUserTransaction={isOtherUserTransaction} isRescanning={isRescanning}
            readOnly={readOnly} onShowImageViewer={onShowImageViewer} onRetry={onRetry} onProcessScan={onProcessScan}
            onOpenFilePicker={onOpenFilePicker} onRescanClick={onRescanClick} onRequestEdit={onRequestEdit} onRescan={onRescan} t={t} />
        </div>

        {mode === 'new' && onBatchModeClick && !readOnly && !effectiveIsProcessing &&
         (scanButtonState === 'idle' || scanButtonState === 'complete') && (
          <button onClick={onBatchModeClick}
            className="w-full p-2.5 rounded-lg border mb-4 flex items-center justify-center gap-2 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/10"
            style={{ borderColor: '#f59e0b', color: '#d97706', backgroundColor: 'transparent' }}>
            <Layers size={16} strokeWidth={2} />
            <span className="text-sm font-medium">{t('batchScan') || 'Escanear Lote'}</span>
          </button>
        )}

        <EditorItemsSection itemViewMode={itemViewMode} onItemViewModeChange={onItemViewModeChange}
          itemsByGroup={itemsByGroup} transaction={transaction} shouldAnimate={shouldAnimate}
          animatedItems={animatedItems} animationPlayedRef={animationPlayedRef}
          editingItemIndex={editingItemIndex} onEditingItemIndexChange={onEditingItemIndexChange}
          onUpdateItem={onUpdateItem} onDeleteItem={onDeleteItem} onAddItem={onAddItem}
          onShowItemCategoryOverlay={setShowItemCategoryOverlay} itemSuggestions={itemSuggestions}
          onShowSuggestion={onShowSuggestion} readOnly={readOnly} effectiveIsProcessing={effectiveIsProcessing}
          isDark={isDark} inputStyle={inputStyle} displayCurrency={displayCurrency}
          formatCurrency={formatCurrency} lang={lang} t={t} theme={theme}
          collapsedGroups={collapsedGroups} onToggleGroupCollapse={onToggleGroupCollapse} />

        <div className="flex justify-between items-center p-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--primary-light)' }}>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('total')} ({displayTransaction.items.length} {displayTransaction.items.length === 1 ? 'item' : 'items'})
          </span>
          <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(calculatedTotal, displayCurrency)}</span>
        </div>

        {readOnly && isOtherUserTransaction ? (
          <div className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {t('addedBy') || 'Added by'}{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ownerProfile?.displayName || t('unknownUser') || 'Unknown'}</span>
          </div>
        ) : readOnly ? (
          <button onClick={onRequestEdit}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{ backgroundColor: 'var(--accent)' }}>
            <Pencil size={18} strokeWidth={2.5} />{t('editTransaction') || 'Editar Transaccion'}
          </button>
        ) : (
          <button onClick={onSaveWithLearning} disabled={isSaving || effectiveIsProcessing || !canSave}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: (isSaving || effectiveIsProcessing || !canSave) ? 'var(--success-muted, #86efac)' : 'var(--success)',
              opacity: (isSaving || effectiveIsProcessing || !canSave) ? 0.5 : 1,
              cursor: !canSave ? 'not-allowed' : 'pointer',
            }}>
            <Check size={18} strokeWidth={2.5} />
            {isSaving ? (t('saving') || 'Guardando...') : (t('saveTransaction') || 'Guardar Transaccion')}
          </button>
        )}
      </div>

      {(displayTransaction.promptVersion || transaction?.id || displayTransaction.merchant) && (
        <div className="rounded-2xl p-4 mt-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
          <button onClick={() => setShowDebugInfo(!showDebugInfo)} className="w-full flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="font-medium">{t('debugInfo')}</span>
            {showDebugInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showDebugInfo && (
            <div className="mt-3 space-y-2 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              {displayTransaction.merchant && (
                <div className="flex justify-between"><span>{t('merchantFromScan')}:</span><span className="truncate max-w-[180px] text-right">{displayTransaction.merchant}</span></div>
              )}
              {displayTransaction.promptVersion && (
                <div className="flex justify-between"><span>Prompt:</span><span>{displayTransaction.promptVersion}</span></div>
              )}
              {transaction?.id && (
                <div className="flex justify-between"><span>ID:</span><span className="truncate max-w-[150px]">{transaction.id}</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {showItemCategoryOverlay !== null && (
        <CategorySelectorOverlay type="item" value={transaction?.items[showItemCategoryOverlay]?.category || ''}
          onSelect={cat => onUpdateItem(showItemCategoryOverlay, 'category', cat)}
          onClose={() => setShowItemCategoryOverlay(null)} language={lang} theme={theme} title={t('itemCat')} />
      )}
    </>
  );
}
