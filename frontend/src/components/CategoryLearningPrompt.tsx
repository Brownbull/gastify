/**
 * CategoryLearningPrompt Component
 *
 * Accessible modal that prompts users to save a category preference for future use.
 * Implements WCAG 2.1 Level AA compliance with proper focus trap and keyboard handling.
 *
 * @module CategoryLearningPrompt
 * @see Story 6.3: Category Learning Prompt
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { X, BookMarked, Loader2 } from 'lucide-react'

/**
 * Item to learn mapping
 */
export interface ItemToLearn {
  itemName: string
  newGroup: string
}

/**
 * Props for the CategoryLearningPrompt component
 */
export interface CategoryLearningPromptProps {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Items to learn (array of item name → group mappings) */
  items: ItemToLearn[]
  /** Callback when user clicks "Yes, Remember" */
  onConfirm: () => void
  /** Callback when user dismisses the modal */
  onClose: () => void
  /** Translation function */
  t: (key: string) => string
  /** Current theme for styling */
  theme?: 'light' | 'dark'
  /** Story 9.16: Loading state during async save operation */
  isLoading?: boolean
}

/**
 * Accessible category learning prompt modal.
 *
 * Features:
 * - WCAG 2.1 Level AA compliant (role="dialog", aria-modal, aria-labelledby)
 * - Focus trap within modal while open
 * - Escape key closes modal
 * - Focus returns to trigger element after close
 * - Support for both English and Spanish translations
 *
 * @param props - CategoryLearningPromptProps
 * @returns Modal component or null when closed
 *
 * @example
 * ```tsx
 * <CategoryLearningPrompt
 *   isOpen={showLearningPrompt}
 *   itemName="UBER EATS"
 *   category="Transport"
 *   onConfirm={handleSaveMapping}
 *   onClose={() => setShowLearningPrompt(false)}
 *   t={t}
 *   theme="light"
 * />
 * ```
 */
export const CategoryLearningPrompt: React.FC<CategoryLearningPromptProps> = ({
  isOpen,
  items,
  onConfirm,
  onClose,
  t,
  theme = 'light',
  isLoading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

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

  // Handle Escape key to close modal (AC#6)
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

  // Focus trap within modal (AC#6)
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

  if (!isOpen || items.length === 0) return null

  // Story 7.12: Theme-aware styling using CSS variables
  const isDark = theme === 'dark'

  // Modal card styling using CSS variables
  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    color: 'var(--primary)',
  }

  // Item list styling
  const itemStyle: React.CSSProperties = {
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

      {/* Modal with CSS variable styling */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-modal-title"
        aria-describedby="learn-modal-description"
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
          {/* Icon with gradient accent */}
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
          >
            <BookMarked size={32} className="text-white" aria-hidden="true" />
          </div>

          {/* Title */}
          <h2
            id="learn-modal-title"
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--primary)' }}
          >
            {t('learnCategoryTitle')}
          </h2>

          {/* Description - show list of items to learn */}
          <div
            id="learn-modal-description"
            className="mb-6"
            style={{ color: 'var(--secondary)' }}
          >
            <p className="mb-3">{t('learnCategoryMessage')}</p>
            <ul className="text-left space-y-2">
              {items.map((item, index) => (
                <li
                  key={index}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={itemStyle}
                >
                  <span className="font-medium" style={{ color: 'var(--primary)' }}>{item.itemName}</span>
                  <span style={{ color: 'var(--secondary)' }}> → </span>
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{item.newGroup}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {/* Story 9.16: Confirm button with loading state (AC #1, #2, #3) */}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-white font-semibold shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  {t('savingPreference')}
                </span>
              ) : (
                t('learnCategoryConfirm')
              )}
            </button>

            {/* Story 9.16: Skip button disabled during loading (AC #2) */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl border font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                borderColor: isDark ? '#475569' : '#e2e8f0',
                color: 'var(--primary)',
                backgroundColor: 'transparent',
              }}
            >
              {t('learnCategorySkip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
