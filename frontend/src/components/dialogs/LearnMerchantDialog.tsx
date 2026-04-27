/**
 * LearnMerchantDialog Component
 *
 * Accessible modal that prompts users to save a merchant name correction for future use.
 * Implements WCAG 2.1 Level AA compliance with proper focus trap and keyboard handling.
 *
 * v9.6.1: Enhanced to support selective learning - users can remove individual items
 * from the learning list before confirming.
 *
 * @module LearnMerchantDialog
 * @see Story 9.6: Merchant Learning Prompt
 */

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { X, BookMarked, Trash2 } from 'lucide-react'
import type { ItemCategory } from '../../../shared/schema/categories'

/**
 * Story 14.30.8: Stable empty array to prevent infinite render loops.
 * Using `itemNameChanges = []` as a default parameter creates a new array
 * reference on every render, which triggers the useEffect infinitely.
 */
const EMPTY_ITEM_CHANGES: ItemNameChange[] = []

/** v9.7.0: Item name change to be learned */
export interface ItemNameChange {
  /** Original item name from AI scan */
  originalName: string
  /** New item name set by user */
  newName: string
  /** Optional category for this item */
  category?: ItemCategory
}

/** v9.6.1: What items to learn when confirming */
export interface LearnMerchantSelection {
  /** Whether to learn the alias change */
  learnAlias: boolean
  /** Whether to learn the category change */
  learnCategory: boolean
  /** v9.7.0: Item name changes to learn */
  itemNamesToLearn: ItemNameChange[]
}

/**
 * Props for the LearnMerchantDialog component
 */
export interface LearnMerchantDialogProps {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Original merchant name (from AI scan or previous value) */
  originalMerchant: string
  /** User's corrected merchant name */
  correctedMerchant: string
  /** v9.6.1: Whether merchant alias changed */
  aliasChanged?: boolean
  /** v9.6.1: Whether store category changed */
  categoryChanged?: boolean
  /** v9.6.1: Original store category (for display) */
  originalCategory?: string
  /** v9.6.1: New store category (for display) */
  newCategory?: string
  /** v9.7.0: Item name changes to prompt for learning */
  itemNameChanges?: ItemNameChange[]
  /** v9.6.1: Callback when user confirms - receives which items to learn */
  onConfirm: (selection: LearnMerchantSelection) => void
  /** Callback when user dismisses the modal */
  onClose: () => void
  /** Translation function */
  t: (key: string) => string
  /** Current theme for styling */
  theme?: 'light' | 'dark'
}

/**
 * Accessible merchant learning prompt modal.
 *
 * Features:
 * - WCAG 2.1 Level AA compliant (role="dialog", aria-modal, aria-labelledby)
 * - Focus trap within modal while open
 * - Escape key closes modal
 * - Focus returns to trigger element after close
 * - Support for both English and Spanish translations
 * - Shows original vs corrected merchant name clearly
 *
 * @param props - LearnMerchantDialogProps
 * @returns Modal component or null when closed
 *
 * @example
 * ```tsx
 * <LearnMerchantDialog
 *   isOpen={showMerchantLearningPrompt}
 *   originalMerchant="SUPERMERC JUMBO #123"
 *   correctedMerchant="Jumbo Supermarket"
 *   onConfirm={handleLearnMerchant}
 *   onClose={() => setShowMerchantLearningPrompt(false)}
 *   t={t}
 *   theme="light"
 * />
 * ```
 */
export const LearnMerchantDialog: React.FC<LearnMerchantDialogProps> = ({
  isOpen,
  originalMerchant,
  correctedMerchant,
  aliasChanged = true, // Default to true for backward compatibility
  categoryChanged = false,
  originalCategory,
  newCategory,
  itemNameChanges = EMPTY_ITEM_CHANGES, // Story 14.30.8: Use stable reference
  onConfirm,
  onClose,
  t,
  theme = 'light',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // v9.6.1: Track which items user wants to learn (can be removed individually)
  const [learnAlias, setLearnAlias] = useState(true)
  const [learnCategory, setLearnCategory] = useState(true)
  // v9.7.0: Track which item name changes user wants to learn
  const [itemNamesToLearn, setItemNamesToLearn] = useState<ItemNameChange[]>([])

  // Reset selections when dialog opens with new props
  useEffect(() => {
    if (isOpen) {
      setLearnAlias(aliasChanged ?? false)
      setLearnCategory(categoryChanged ?? false)
      setItemNamesToLearn(itemNameChanges ?? [])
    }
  }, [isOpen, aliasChanged, categoryChanged, itemNameChanges])

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      // Focus the close button after a short delay to allow modal to render
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  // Restore focus when modal closes
  const handleClose = useCallback(() => {
    onClose()
    // Return focus to the element that triggered the modal
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.()
    }, 0)
  }, [onClose])

  // Handle Escape key to close modal (AC#5 - same UX as category learning)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Focus trap within modal (AC#5 - accessibility)
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modalElement = modalRef.current
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // v9.6.1: Handle removing alias from learning list
  const handleRemoveAlias = useCallback(() => {
    setLearnAlias(false)
    // If nothing left to learn, close the dialog
    if (!learnCategory && itemNamesToLearn.length === 0) {
      handleClose()
    }
  }, [learnCategory, itemNamesToLearn.length, handleClose])

  // v9.6.1: Handle removing category from learning list
  const handleRemoveCategory = useCallback(() => {
    setLearnCategory(false)
    // If nothing left to learn, close the dialog
    if (!learnAlias && itemNamesToLearn.length === 0) {
      handleClose()
    }
  }, [learnAlias, itemNamesToLearn.length, handleClose])

  // v9.7.0: Handle removing an item name change from learning list
  const handleRemoveItemName = useCallback((index: number) => {
    const newList = itemNamesToLearn.filter((_, i) => i !== index)
    setItemNamesToLearn(newList)
    // If nothing left to learn, close the dialog
    if (!learnAlias && !learnCategory && newList.length === 0) {
      handleClose()
    }
  }, [learnAlias, learnCategory, itemNamesToLearn, handleClose])

  // v9.6.1: Handle confirm with selection
  const handleConfirm = useCallback(() => {
    onConfirm({ learnAlias, learnCategory, itemNamesToLearn })
  }, [onConfirm, learnAlias, learnCategory, itemNamesToLearn])

  // Don't render if not open or no changes to learn
  // v9.6.1: Check both initial props AND current selections
  // v9.7.0: Also check for item name changes
  const hasChangesToLearn = aliasChanged || categoryChanged || itemNameChanges.length > 0
  const hasSelectedItems = (aliasChanged && learnAlias) || (categoryChanged && learnCategory) || itemNamesToLearn.length > 0
  if (!isOpen || !originalMerchant || !hasChangesToLearn || !hasSelectedItems) return null

  // Theme-aware styling using CSS variables
  const isDark = theme === 'dark'

  // Modal card styling using CSS variables
  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    color: 'var(--primary)',
  }

  // Merchant display styling
  const merchantBoxStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20"
      onClick={handleClose}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal with CSS variable styling */}
      {/* Story 14.30.8: Added max-h and overflow-y-auto to prevent content being hidden behind bottom nav */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-merchant-modal-title"
        aria-describedby="learn-merchant-modal-description"
        className="relative w-full max-w-sm max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl shadow-xl"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 rounded-full transition-colors"
          style={{
            color: 'var(--secondary)',
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
          }}
          aria-label={t('close') || 'Close'}
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon with gradient accent */}
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
          >
            <BookMarked size={32} className="text-white" aria-hidden="true" />
          </div>

          {/* Title (AC#1) */}
          <h2
            id="learn-merchant-modal-title"
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--primary)' }}
          >
            {t('learnMerchantTitle')}
          </h2>

          {/* Description (AC#2 - shows original vs corrected clearly) */}
          <div
            id="learn-merchant-modal-description"
            className="mb-6"
            style={{ color: 'var(--secondary)' }}
          >
            <p className="mb-4">{t('learnMerchantMessage')}</p>

            {/* v9.6.1: Show alias change if selected for learning */}
            {aliasChanged && learnAlias && (
              <div className="relative">
                {/* Remove button for alias */}
                <button
                  onClick={handleRemoveAlias}
                  className="absolute -right-1 -top-1 p-1.5 rounded-full transition-colors z-10"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#f1f5f9',
                    color: isDark ? '#ef4444' : '#dc2626',
                  }}
                  aria-label={t('removeFromLearning') || 'Remove from learning'}
                  title={t('removeFromLearning') || 'Remove from learning'}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>

                {/* Original merchant */}
                <div className="text-left mb-2">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>
                    {t('learnMerchantOriginal')}
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg text-sm font-mono"
                    style={merchantBoxStyle}
                  >
                    <span style={{ color: 'var(--secondary)' }}>{originalMerchant}</span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="text-center my-2" style={{ color: 'var(--secondary)' }}>
                  ↓
                </div>

                {/* Corrected merchant */}
                <div className="text-left">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>
                    {t('learnMerchantCorrected')}
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      ...merchantBoxStyle,
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                      {correctedMerchant}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* v9.6.1: Show category change if selected for learning */}
            {categoryChanged && learnCategory && originalCategory && newCategory && (
              <div
                className={`relative ${aliasChanged && learnAlias ? 'mt-4 pt-4 border-t' : ''}`}
                style={{ borderColor: isDark ? '#475569' : '#e2e8f0' }}
              >
                {/* Remove button for category */}
                <button
                  onClick={handleRemoveCategory}
                  className="absolute -right-1 -top-1 p-1.5 rounded-full transition-colors z-10"
                  style={{
                    backgroundColor: isDark ? '#374151' : '#f1f5f9',
                    color: isDark ? '#ef4444' : '#dc2626',
                    // Adjust position if this is below the alias section
                    ...(aliasChanged && learnAlias ? { top: '0.75rem' } : {}),
                  }}
                  aria-label={t('removeFromLearning') || 'Remove from learning'}
                  title={t('removeFromLearning') || 'Remove from learning'}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>

                {/* Original category */}
                <div className="text-left mb-2">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>
                    {t('learnMerchantOriginalCategory') || 'Original category'}
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg text-sm"
                    style={merchantBoxStyle}
                  >
                    <span style={{ color: 'var(--secondary)' }}>{originalCategory}</span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="text-center my-2" style={{ color: 'var(--secondary)' }}>
                  ↓
                </div>

                {/* New category */}
                <div className="text-left">
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--secondary)' }}>
                    {t('learnMerchantNewCategory') || 'New category'}
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      ...merchantBoxStyle,
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                      {newCategory}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* v9.7.0: Show item name changes if any selected for learning */}
            {itemNamesToLearn.length > 0 && (
              <div
                className={`relative ${(aliasChanged && learnAlias) || (categoryChanged && learnCategory) ? 'mt-4 pt-4 border-t' : ''}`}
                style={{ borderColor: isDark ? '#475569' : '#e2e8f0' }}
              >
                {/* Section header */}
                <div className="text-xs font-medium mb-3" style={{ color: 'var(--secondary)' }}>
                  {t('learnItemNamesTitle') || 'Item names to remember'}
                </div>

                {/* Item name changes list */}
                <div className="space-y-2">
                  {itemNamesToLearn.map((change, index) => (
                    <div
                      key={`${change.originalName}-${index}`}
                      className="relative px-3 py-2 rounded-lg text-sm"
                      style={merchantBoxStyle}
                    >
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveItemName(index)}
                        className="absolute -right-1 -top-1 p-1 rounded-full transition-colors z-10"
                        style={{
                          backgroundColor: isDark ? '#374151' : '#f1f5f9',
                          color: isDark ? '#ef4444' : '#dc2626',
                        }}
                        aria-label={t('removeFromLearning') || 'Remove from learning'}
                        title={t('removeFromLearning') || 'Remove from learning'}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>

                      {/* Item name: original → new */}
                      <div className="flex items-center gap-2 pr-4">
                        <span
                          className="truncate"
                          style={{ color: 'var(--secondary)', maxWidth: '45%' }}
                          title={change.originalName}
                        >
                          {change.originalName}
                        </span>
                        <span style={{ color: 'var(--secondary)' }}>→</span>
                        <span
                          className="font-semibold truncate"
                          style={{ color: 'var(--accent)', maxWidth: '45%' }}
                          title={change.newName}
                        >
                          {change.newName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons (AC#3, AC#4) */}
          <div className="flex flex-col gap-3">
            {/* Remember button (AC#3) - v9.6.1: Uses handleConfirm with selection */}
            <button
              onClick={handleConfirm}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
            >
              {t('learnMerchantConfirm')}
            </button>

            {/* Skip button (AC#4) */}
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 rounded-xl border font-medium transition-colors"
              style={{
                borderColor: isDark ? '#475569' : '#e2e8f0',
                color: 'var(--primary)',
                backgroundColor: 'transparent',
              }}
            >
              {t('learnMerchantSkip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
