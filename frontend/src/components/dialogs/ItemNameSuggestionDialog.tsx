/**
 * ItemNameSuggestionDialog Component
 *
 * Phase 4: Cross-Store Item Name Suggestions
 *
 * A compact modal dialog that shows a suggestion when an item has a learned
 * name at a different store. Allows user to apply the suggestion or dismiss it.
 *
 * Features:
 * - Shows the suggested name and origin store
 * - Displays original → suggested name transformation
 * - "Apply" and "Not Now" action buttons
 * - WCAG 2.1 Level AA compliant with focus trap
 * - Theme-aware styling consistent with other dialogs
 *
 * @module ItemNameSuggestionDialog
 * @see LearnMerchantDialog - Similar dialog structure
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { X, Lightbulb, ArrowRight } from 'lucide-react'

/**
 * Props for the ItemNameSuggestionDialog component
 */
export interface ItemNameSuggestionDialogProps {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Original item name (from current scan) */
  originalItemName: string
  /** Suggested item name (from another store's learned mapping) */
  suggestedItemName: string
  /** The store where this name was learned */
  fromMerchant: string
  /** Callback when user wants to apply the suggestion */
  onApply: () => void
  /** Callback when user dismisses */
  onDismiss: () => void
  /** Translation function */
  t: (key: string) => string
  /** Current theme for styling */
  theme?: 'light' | 'dark'
}

/**
 * ItemNameSuggestionDialog - Compact modal for cross-store name suggestions
 *
 * @param props - ItemNameSuggestionDialogProps
 * @returns Modal component or null when closed
 *
 * @example
 * ```tsx
 * <ItemNameSuggestionDialog
 *   isOpen={showSuggestion}
 *   originalItemName="PROD LACTEO 1L"
 *   suggestedItemName="Leche Entera 1L"
 *   fromMerchant="Jumbo"
 *   onApply={handleApplySuggestion}
 *   onDismiss={() => setShowSuggestion(false)}
 *   t={t}
 *   theme="light"
 * />
 * ```
 */
export const ItemNameSuggestionDialog: React.FC<ItemNameSuggestionDialogProps> = ({
  isOpen,
  originalItemName,
  suggestedItemName,
  fromMerchant,
  onApply,
  onDismiss,
  t,
  theme = 'light',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  const isDark = theme === 'dark'

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
    onDismiss()
    // Return focus to the element that triggered the modal
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.()
    }, 0)
  }, [onDismiss])

  // Handle Escape key to close modal
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

  // Focus trap within modal
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

  // Don't render if not open
  if (!isOpen) return null

  // Handle apply and close
  const handleApply = useCallback(() => {
    onApply()
    // Return focus to the element that triggered the modal
    setTimeout(() => {
      (previousActiveElement.current as HTMLElement)?.focus?.()
    }, 0)
  }, [onApply])

  // Modal card styling using CSS variables
  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    color: 'var(--primary)',
  }

  // Name box styling
  const nameBoxStyle: React.CSSProperties = {
    backgroundColor: isDark ? '#334155' : '#f1f5f9',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-modal-title"
        aria-describedby="suggestion-modal-description"
        className="relative w-full max-w-sm rounded-2xl shadow-xl"
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
          {/* Icon with accent color */}
          <div
            className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            <Lightbulb size={28} className="text-white" aria-hidden="true" />
          </div>

          {/* Title */}
          <h2
            id="suggestion-modal-title"
            className="text-lg font-bold mb-2"
            style={{ color: 'var(--primary)' }}
          >
            {t('crossStoreSuggestionTitle') || 'Suggestion'}
          </h2>

          {/* Description */}
          <div
            id="suggestion-modal-description"
            className="mb-5"
            style={{ color: 'var(--secondary)' }}
          >
            <p className="text-sm mb-4">
              {t('crossStoreSuggestionMessage')?.replace('{store}', fromMerchant) ||
                `At ${fromMerchant}, this is called:`}
            </p>

            {/* Name transformation display */}
            <div className="space-y-2">
              {/* Original name */}
              <div
                className="px-3 py-2 rounded-lg text-sm text-left"
                style={nameBoxStyle}
              >
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--secondary)' }}>
                  {t('current') || 'Current'}
                </div>
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--secondary)' }}
                >
                  {originalItemName}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight
                  size={18}
                  style={{ color: 'var(--secondary)' }}
                  aria-hidden="true"
                />
              </div>

              {/* Suggested name */}
              <div
                className="px-3 py-2 rounded-lg text-sm text-left"
                style={{
                  ...nameBoxStyle,
                  borderLeft: '3px solid #3b82f6',
                }}
              >
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--secondary)' }}>
                  {t('suggested') || 'Suggested'}
                </div>
                <span
                  className="font-semibold text-sm"
                  style={{ color: '#3b82f6' }}
                >
                  {suggestedItemName}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            {/* Apply button */}
            <button
              onClick={handleApply}
              className="w-full py-2.5 px-4 rounded-xl text-white font-semibold shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              {t('applySuggestion') || 'Apply'}
            </button>

            {/* Dismiss button */}
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl border font-medium transition-colors"
              style={{
                borderColor: isDark ? '#475569' : '#e2e8f0',
                color: 'var(--primary)',
                backgroundColor: 'transparent',
              }}
            >
              {t('notNow') || 'Not Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemNameSuggestionDialog
