/**
 * TransactionEditorView — Orchestrating parent component
 * Story 16-5: Reduced from 1,128 lines. Composes Form + ScanStatus + extracted sub-components.
 * NO @features/scan imports — scan dependencies isolated in TransactionEditorScanStatus.
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { ImageViewer } from '@/components/ImageViewer';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useStaggeredReveal } from '@/hooks/useStaggeredReveal';
import { useModalActions } from '@managers/ModalManager';
import { useToast } from '@/shared/hooks';
import { hasItemWithPrice } from '@/utils/transactionValidation';
import { deriveItemsPrices } from '@entities/transaction/utils/itemPriceDerivation';
import { sanitizeMerchantName, sanitizeItemName, sanitizeLocation, sanitizeSubcategory } from '@/utils/sanitize';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import { getItemCategoryGroup } from '@/config/categoryColors';
import { EditorConfirmationDialogs } from './TransactionEditorView/EditorConfirmationDialogs';
import { useCrossStoreSuggestions } from './TransactionEditorView/useCrossStoreSuggestions';
import { useEditorLearningPrompts } from './TransactionEditorView/useEditorLearningPrompts';
import { useEditorSwipeGestures } from './TransactionEditorView/useEditorSwipeGestures';
import { EditorHeaderBar } from './TransactionEditorView/EditorHeaderBar';
import { TransactionEditorScanStatus } from './TransactionEditorScanStatus';
import { TransactionEditorForm } from './TransactionEditorForm';
import type { Transaction, TransactionItem } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';
import type { ItemViewMode } from '@/components/items/ItemViewToggle';
import type { TransactionEditorViewProps } from './TransactionEditorView/editorViewTypes';
export type { TransactionEditorViewProps, ScanButtonState } from './TransactionEditorView/editorViewTypes';

export const TransactionEditorView: React.FC<TransactionEditorViewProps> = ({
  transaction, mode, readOnly = false, onRequestEdit, isOtherUserTransaction = false, ownerProfile,
  scanButtonState, isProcessing, processingEta, skipScanCompleteModal = false,
  thumbnailUrl, pendingImageUrl,
  onUpdateTransaction, onSave, onCancel, onPhotoSelect, onProcessScan, onRetry, onRescan,
  isRescanning = false, onDelete, onSaveMapping, onSaveMerchantMapping,
  onSaveSubcategoryMapping, onSaveItemNameMapping,
  theme, t, formatCurrency, currency, lang, credits, storeCategories,
  distinctAliases = [], batchContext = null, onBatchPrevious, onBatchNext,
  defaultCity = '', defaultCountry = '',
  isSaving = false, animateItems = false, creditUsed = false,
  itemNameMappings = [], onBatchModeClick,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { openModal, closeModal } = useModalActions();
  const openCreditInfoModal = () => openModal('creditInfo', {
    normalCredits: credits.remaining, superCredits: credits.superRemaining ?? 0, onClose: closeModal,
  });
  const displayCurrency = transaction?.currency || currency;

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRescanConfirm, setShowRescanConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemViewMode, setItemViewMode] = useState<ItemViewMode>('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { swipeOffset, swipeTouchStart, fadeInKey, handleSwipeTouchStart, handleSwipeTouchMove, handleSwipeTouchEnd } =
    useEditorSwipeGestures({ batchContext, onBatchPrevious, onBatchNext, transactionId: transaction?.id });

  const originalAliasRef = useRef<string | null>(null);
  const originalStoreCategoryRef = useRef<StoreCategory | null>(null);
  const originalItemGroupsRef = useRef<{
    items: Array<{ name: string; category: string; subcategory: string }>; capturedForTransactionKey: string | null;
  }>({ items: [], capturedForTransactionKey: null });
  const initialTransactionRef = useRef<Transaction | null>(null);
  const hasCredits = (credits?.remaining ?? 0) > 0 || (credits?.superRemaining ?? 0) > 0;

  useEffect(() => {
    if (!transaction) return;
    const txKey = transaction.id || 'new';
    const hasData = transaction.merchant || transaction.items.length > 0;
    if (hasData && originalItemGroupsRef.current.capturedForTransactionKey !== txKey) {
      originalItemGroupsRef.current = {
        items: transaction.items.map(i => ({ name: i.name, category: i.category || '', subcategory: i.subcategory || '' })),
        capturedForTransactionKey: txKey,
      };
    }
  }, [transaction?.id, transaction?.items]);

  useEffect(() => {
    if (!transaction) return;
    if ((transaction.merchant || transaction.alias) && originalAliasRef.current === null)
      originalAliasRef.current = transaction.alias || '';
  }, [transaction?.merchant, transaction?.alias]);

  useEffect(() => {
    if (!transaction) return;
    if ((transaction.merchant || transaction.category) && originalStoreCategoryRef.current === null)
      originalStoreCategoryRef.current = (transaction.category as StoreCategory) || null;
  }, [transaction?.merchant, transaction?.category]);

  useEffect(() => {
    if (!transaction) return;
    const txKey = transaction.id || 'new';
    if (!initialTransactionRef.current || (initialTransactionRef.current.id || 'new') !== txKey)
      initialTransactionRef.current = JSON.parse(JSON.stringify(transaction));
  }, [transaction?.id]);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialTransactionRef.current || !transaction) return false;
    const i = initialTransactionRef.current;
    return i.merchant !== transaction.merchant || i.alias !== transaction.alias ||
      i.total !== transaction.total || i.date !== transaction.date || i.time !== transaction.time ||
      i.category !== transaction.category || i.country !== transaction.country || i.city !== transaction.city ||
      JSON.stringify(i.items) !== JSON.stringify(transaction.items);
  }, [transaction]);

  const calculatedTotal = useMemo(() => {
    if (!transaction?.items) return 0;
    return transaction.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [transaction?.items]);

  const itemsByGroup = useMemo(() => {
    if (!transaction?.items) return [];
    const groups: Record<string, Array<{ item: TransactionItem; originalIndex: number }>> = {};
    transaction.items.forEach((item, index) => {
      const gk = getItemCategoryGroup(normalizeItemCategory(item.category || 'Other'));
      if (!groups[gk]) groups[gk] = [];
      groups[gk].push({ item, originalIndex: index });
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
      .map(([groupKey, items]) => ({ groupKey, items: items.sort((a, b) => b.item.totalPrice - a.item.totalPrice), total: items.reduce((s, { item }) => s + item.totalPrice, 0) }));
  }, [transaction?.items]);

  const { itemSuggestions, handleShowSuggestion } = useCrossStoreSuggestions({
    transaction, itemNameMappings, onUpdateTransaction, onSaveItemNameMapping,
    showToast, openModal, closeModal, t, theme,
  });

  const animationPlayedRef = useRef(false);
  const shouldAnimate = animateItems && !animationPlayedRef.current;
  const { visibleItems: animatedItems, isComplete: animationComplete } = useStaggeredReveal(
    shouldAnimate && transaction?.items ? transaction.items : [],
    { staggerMs: 100, initialDelayMs: 300, maxDurationMs: 2500 }
  );
  useEffect(() => { if (animationComplete && shouldAnimate) animationPlayedRef.current = true; }, [animationComplete, shouldAnimate]);

  const hasNewThumbnail = mode === 'new' && !!thumbnailUrl;
  const shouldWarnOnCancel = !readOnly && (creditUsed || hasUnsavedChanges || hasNewThumbnail);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onPhotoSelect(f); e.target.value = ''; };
  const handleOpenFilePicker = () => fileInputRef.current?.click();
  const handleCancelClick = useCallback(() => { if (shouldWarnOnCancel) setShowCancelConfirm(true); else onCancel(); }, [shouldWarnOnCancel, onCancel]);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey); return next; });
  };

  const handleAddItem = () => {
    if (!transaction) return;
    onUpdateTransaction({ ...transaction, items: [...transaction.items, { name: '', totalPrice: 0, qty: 1, category: 'Other', subcategory: '' }] });
    setEditingItemIndex(transaction.items.length);
  };
  const handleUpdateItem = (index: number, field: string, value: unknown) => {
    if (!transaction) return;
    const newItems = [...transaction.items];
    const safeValue = field === 'qty' ? Math.min(Math.max(1, Number(value) || 1), 9999) : value;
    newItems[index] = { ...newItems[index], [field]: safeValue };
    onUpdateTransaction({ ...transaction, items: newItems });
  };
  const handleDeleteItem = (index: number) => {
    if (!transaction) return;
    onUpdateTransaction({ ...transaction, items: transaction.items.filter((_, x) => x !== index) });
    setEditingItemIndex(null);
  };

  const handleFinalSave = async () => {
    if (!transaction) return;
    await onSave({
      ...transaction,
      merchant: sanitizeMerchantName(transaction.merchant) || t('unknown') || 'Desconocido',
      alias: sanitizeMerchantName(transaction.alias || ''),
      city: sanitizeLocation(transaction.city || ''), country: sanitizeLocation(transaction.country || ''),
      total: calculatedTotal,
      items: deriveItemsPrices(transaction.items.map(item => ({
        ...item, name: sanitizeItemName(item.name), subcategory: item.subcategory ? sanitizeSubcategory(item.subcategory) : undefined,
      }))),
    });
  };

  const handleRescanClick = () => { if (!hasCredits) { showToast(t('noCreditsMessage'), 'info'); return; } setShowRescanConfirm(true); };
  const handleConfirmRescan = async () => { setShowRescanConfirm(false); await onRescan?.(); };

  const displayImageUrl = thumbnailUrl || pendingImageUrl;
  const hasImages = !!displayImageUrl || !!(transaction?.imageUrls && transaction.imageUrls.length > 0);
  const inputStyle: React.CSSProperties = { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#475569' : '#e2e8f0', color: 'var(--primary)' };
  const canSave = calculatedTotal > 0 && hasItemWithPrice(transaction?.items);
  const displayTransaction = useMemo(() => transaction || {
    id: undefined, merchant: '', alias: '', date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5), total: 0, category: 'Other' as StoreCategory,
    items: [] as TransactionItem[], country: defaultCountry, city: defaultCity, currency,
  } as Transaction, [transaction, defaultCountry, defaultCity, currency]);

  const { handleSaveWithLearning } = useEditorLearningPrompts({
    transaction, originalItemGroupsRef, originalAliasRef, originalStoreCategoryRef,
    getDisplayTransaction: () => ({ merchant: displayTransaction.merchant, alias: displayTransaction.alias, category: displayTransaction.category }),
    lang, t, theme, onSaveMapping, onSaveMerchantMapping, onSaveSubcategoryMapping, onSaveItemNameMapping,
    onFinalSave: handleFinalSave, showToast, openModal, closeModal,
  });

  return (
    <div className="relative" style={{ paddingBottom: 'calc(6rem + var(--safe-bottom, 0px))' }}>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" aria-hidden="true" />
      <style>{`
        @keyframes scan-breathe { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.03); opacity: 1; } }
        @keyframes scan-pulse-border { 0%, 100% { border-color: var(--primary); opacity: 0.6; } 50% { border-color: var(--primary); opacity: 1; } }
        @keyframes process-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); } }
        @keyframes processing-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes scan-icon-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes scan-shine-sweep { 0% { left: -100%; opacity: 0.4; } 50% { opacity: 0.8; } 100% { left: 100%; opacity: 0.4; } }
        @keyframes transaction-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>

      <EditorHeaderBar mode={mode} transactionId={transaction?.id} credits={credits}
        onCancelClick={handleCancelClick} onDeleteClick={() => setShowDeleteConfirm(true)} onCreditInfoClick={openCreditInfoModal} t={t} />

      {batchContext && (
        <div className="px-4 pb-2 flex justify-center items-center gap-2">
          <button onClick={onBatchPrevious} disabled={!onBatchPrevious || batchContext.index <= 1}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }} aria-label={t('previous')}>
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
            <Receipt size={14} strokeWidth={2} />{batchContext.index} {t('batchOfMax')} {batchContext.total}
          </span>
          <button onClick={onBatchNext} disabled={!onBatchNext || batchContext.index >= batchContext.total}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }} aria-label={t('next')}>
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div key={`transaction-content-${fadeInKey}`} className="px-3 pb-4 relative"
        onTouchStart={handleSwipeTouchStart} onTouchMove={handleSwipeTouchMove} onTouchEnd={handleSwipeTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`, opacity: Math.max(0.3, 1 - Math.abs(swipeOffset) / 150),
          transition: swipeTouchStart === null ? 'transform 0.2s ease-out, opacity 0.2s ease-out' : 'none',
          animation: batchContext && fadeInKey > 0 ? 'transaction-fade-in 0.25s ease-out' : undefined,
        }}>
        <TransactionEditorScanStatus scanButtonState={scanButtonState} isProcessing={isProcessing}
          processingEta={processingEta} skipScanCompleteModal={skipScanCompleteModal} transaction={transaction}
          mode={mode} onSaveWithLearning={handleSaveWithLearning} theme={theme} t={t}
          formatCurrency={formatCurrency} currency={currency} lang={lang} isSaving={isSaving} />
        <TransactionEditorForm transaction={transaction} displayTransaction={displayTransaction} mode={mode}
          readOnly={readOnly} isOtherUserTransaction={isOtherUserTransaction} ownerProfile={ownerProfile}
          calculatedTotal={calculatedTotal} canSave={canSave} displayCurrency={displayCurrency}
          effectiveIsProcessing={isProcessing} displayImageUrl={displayImageUrl} pendingImageUrl={pendingImageUrl}
          hasImages={hasImages} scanButtonState={scanButtonState} hasCredits={hasCredits} isRescanning={isRescanning}
          prefersReducedMotion={prefersReducedMotion} editingItemIndex={editingItemIndex} onEditingItemIndexChange={setEditingItemIndex}
          itemViewMode={itemViewMode} onItemViewModeChange={setItemViewMode} collapsedGroups={collapsedGroups}
          onToggleGroupCollapse={toggleGroupCollapse} itemsByGroup={itemsByGroup} shouldAnimate={shouldAnimate}
          animatedItems={animatedItems} animationPlayedRef={animationPlayedRef} itemSuggestions={itemSuggestions}
          onUpdateTransaction={onUpdateTransaction} onUpdateItem={handleUpdateItem} onDeleteItem={handleDeleteItem}
          onAddItem={handleAddItem} onShowSuggestion={handleShowSuggestion} onOpenFilePicker={handleOpenFilePicker}
          onRetry={onRetry} onProcessScan={onProcessScan} onRescanClick={handleRescanClick} onRescan={onRescan}
          onRequestEdit={onRequestEdit} onShowImageViewer={() => setShowImageViewer(true)} onBatchModeClick={onBatchModeClick}
          onSaveWithLearning={handleSaveWithLearning} isSaving={isSaving} theme={theme} isDark={isDark}
          inputStyle={inputStyle} t={t} formatCurrency={formatCurrency} lang={lang}
          storeCategories={storeCategories} defaultCountry={defaultCountry} />
      </div>

      <datalist id="alias-list">{distinctAliases.map((a, i) => <option key={i} value={a} />)}</datalist>
      {showImageViewer && (transaction?.imageUrls?.length ?? 0) > 0 && (
        <ImageViewer images={transaction?.imageUrls ?? []} merchantName={displayTransaction.merchant} onClose={() => setShowImageViewer(false)} />
      )}
      <EditorConfirmationDialogs showCancelConfirm={showCancelConfirm} onDismissCancelConfirm={() => setShowCancelConfirm(false)}
        onConfirmCancel={() => { setShowCancelConfirm(false); onCancel(); }} creditUsed={creditUsed}
        showRescanConfirm={showRescanConfirm} onDismissRescanConfirm={() => setShowRescanConfirm(false)} onConfirmRescan={handleConfirmRescan}
        showDeleteConfirm={showDeleteConfirm} hasTransactionId={!!transaction?.id} onDismissDeleteConfirm={() => setShowDeleteConfirm(false)}
        onConfirmDelete={() => { setShowDeleteConfirm(false); if (transaction?.id) onDelete?.(transaction.id); }} isDark={isDark} t={t} />
    </div>
  );
};

export default TransactionEditorView;
