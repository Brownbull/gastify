/**
 * ItemNameSuggestionIndicator Component
 *
 * Phase 4: Cross-Store Item Name Suggestions
 *
 * A small indicator component that shows a glowing outline and info icon
 * when an item has a learned name at a different store. Provides visual
 * feedback to suggest applying a cross-store item name.
 *
 * Features:
 * - Subtle glowing CSS animation around the indicator
 * - Info/lightbulb icon that's clickable
 * - Non-intrusive design that doesn't distract from main content
 * - Theme-aware styling
 *
 * @module ItemNameSuggestionIndicator
 */

import React from 'react'
import { Lightbulb } from 'lucide-react'

/**
 * Props for the ItemNameSuggestionIndicator component
 */
export interface ItemNameSuggestionIndicatorProps {
  /** The suggested name from another store */
  suggestedName: string
  /** The store where this name was learned */
  fromStore: string
  /** Callback when user clicks to see suggestion */
  onClick: () => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
}

/**
 * ItemNameSuggestionIndicator - Shows a glowing indicator for cross-store suggestions
 *
 * @param props - ItemNameSuggestionIndicatorProps
 * @returns Indicator component with glowing animation and clickable icon
 *
 * @example
 * ```tsx
 * <ItemNameSuggestionIndicator
 *   suggestedName="Leche Entera 1L"
 *   fromStore="Jumbo"
 *   onClick={() => setShowSuggestionDialog(true)}
 *   theme="light"
 * />
 * ```
 */
export const ItemNameSuggestionIndicator: React.FC<ItemNameSuggestionIndicatorProps> = ({
  suggestedName: _suggestedName, // Props available for future tooltip enhancement
  fromStore: _fromStore,
  onClick,
  theme = 'light',
}) => {
  const isDark = theme === 'dark'

  return (
    <>
      {/* CSS Keyframes for glow animation */}
      <style>
        {`
          @keyframes suggestion-glow {
            0%, 100% {
              box-shadow: 0 0 4px 1px rgba(59, 130, 246, 0.4);
            }
            50% {
              box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6);
            }
          }
          @keyframes suggestion-pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.9;
            }
            50% {
              transform: scale(1.1);
              opacity: 1;
            }
          }
        `}
      </style>

      {/* Clickable indicator button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation() // Prevent triggering parent click handlers
          onClick()
        }}
        className="flex items-center justify-center rounded-full transition-transform active:scale-95"
        style={{
          width: '22px',
          height: '22px',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.4)',
          animation: 'suggestion-glow 2s ease-in-out infinite',
        }}
        aria-label="View suggestion from another store"
        title="Suggestion available"
      >
        <Lightbulb
          size={12}
          strokeWidth={2.5}
          style={{
            color: isDark ? '#60a5fa' : '#3b82f6',
            animation: 'suggestion-pulse 2s ease-in-out infinite',
          }}
        />
      </button>
    </>
  )
}

export default ItemNameSuggestionIndicator
