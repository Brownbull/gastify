/**
 * DashboardRecientesSection - Recent transactions carousel section
 *
 * Story 15-TD-5b: Extracted from DashboardView Section 2 (Recientes Carousel).
 * Contains the header (title/selection mode), transaction list with swipe,
 * and the 2-segment indicator bar.
 */

import React from 'react';
import { Inbox, X, Trash2, CheckSquare } from 'lucide-react';
import type { Transaction } from './types';

// ============================================================================
// Types
// ============================================================================

export interface DashboardRecientesSectionProps {
    cardStyle: React.CSSProperties;
    // Header
    recientesSlide: 0 | 1;
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    exitSelectionMode: () => void;
    handleViewAll: () => void;
    visibleRecientesIds: string[];
    handleRecientesSelectAllToggle: () => void;
    handleOpenDelete: () => void;
    // Transaction list
    recentTransactions: Transaction[];
    recientesAnimKey: number;
    recientesSlideDirection: 'left' | 'right' | null;
    renderTransactionItem: (tx: Transaction, index: number) => React.ReactNode;
    canExpand: boolean;
    recientesExpanded: boolean;
    setRecientesExpanded: (expanded: boolean) => void;
    t: (key: string) => string;
    // Swipe handlers
    setRecientesTouchStart: (x: number | null) => void;
    setRecientesTouchEnd: (x: number | null) => void;
    recientesTouchStart: number | null;
    recientesTouchEnd: number | null;
    goToRecientesSlide: (targetSlide: 0 | 1, direction: 'left' | 'right') => void;
}

// ============================================================================
// Component
// ============================================================================

export const DashboardRecientesSection: React.FC<DashboardRecientesSectionProps> = ({
    cardStyle,
    recientesSlide,
    isSelectionMode,
    selectedIds,
    exitSelectionMode,
    handleViewAll,
    visibleRecientesIds,
    handleRecientesSelectAllToggle,
    handleOpenDelete,
    recentTransactions,
    recientesAnimKey,
    recientesSlideDirection,
    renderTransactionItem,
    canExpand,
    recientesExpanded,
    setRecientesExpanded,
    t,
    setRecientesTouchStart,
    setRecientesTouchEnd,
    recientesTouchStart,
    recientesTouchEnd,
    goToRecientesSlide,
}) => {
    return (
        <div className="rounded-xl border overflow-hidden" style={cardStyle}>
            {/* Section Header - fixed height (h-10 = 40px) to prevent layout shift between modes */}
            <div className="flex justify-between items-center px-2.5 h-10 relative">
                {/* Left side: Title or Selection count - uses absolute positioning for smooth transitions */}
                <div className="flex items-center gap-2 h-full">
                    {/* Normal mode: Title + Expand button */}
                    <div
                        className="flex items-center gap-2 transition-opacity duration-150"
                        style={{
                            opacity: isSelectionMode ? 0 : 1,
                            pointerEvents: isSelectionMode ? 'none' : 'auto',
                            position: isSelectionMode ? 'absolute' : 'relative',
                        }}
                    >
                        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {recientesSlide === 0 ? t('latestScanned') : t('byDate')}
                        </h2>
                    </div>
                    {/* Selection mode: X button + count */}
                    <div
                        className="flex items-center gap-2 transition-opacity duration-150"
                        style={{
                            opacity: isSelectionMode ? 1 : 0,
                            pointerEvents: isSelectionMode ? 'auto' : 'none',
                            position: isSelectionMode ? 'relative' : 'absolute',
                        }}
                    >
                        <button
                            onClick={exitSelectionMode}
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                            aria-label={t('cancelSelection')}
                        >
                            <X size={14} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {selectedIds.size} {selectedIds.size === 1 ? t('selectedSingular') : t('selected')}
                        </span>
                    </div>
                </div>
                {/* Right side: Ver todo or Action buttons - uses absolute positioning for smooth transitions */}
                <div className="flex items-center h-full">
                    {/* Normal mode: Ver todo link */}
                    <div
                        className="transition-opacity duration-150"
                        style={{
                            opacity: isSelectionMode ? 0 : 1,
                            pointerEvents: isSelectionMode ? 'none' : 'auto',
                            position: isSelectionMode ? 'absolute' : 'relative',
                            right: isSelectionMode ? '0.625rem' : undefined,
                        }}
                    >
                        <button
                            onClick={handleViewAll}
                            className="text-sm font-medium"
                            style={{ color: 'var(--primary)' }}
                            data-testid="view-all-link"
                        >
                            {t('viewAll')} →
                        </button>
                    </div>
                    {/* Selection mode: Action buttons */}
                    <div
                        className="flex items-center gap-2 transition-opacity duration-150"
                        style={{
                            opacity: isSelectionMode ? 1 : 0,
                            pointerEvents: isSelectionMode ? 'auto' : 'none',
                            position: isSelectionMode ? 'relative' : 'absolute',
                            right: isSelectionMode ? undefined : '0.625rem',
                        }}
                    >
                        <button
                            onClick={handleRecientesSelectAllToggle}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: 'var(--secondary)' }}
                            aria-label={visibleRecientesIds.every(id => selectedIds.has(id)) ? t('deselectAll') : t('selectAll')}
                            data-testid="recientes-select-all"
                        >
                            <CheckSquare
                                size={16}
                                style={{ color: 'white' }}
                                fill={visibleRecientesIds.length > 0 && visibleRecientesIds.every(id => selectedIds.has(id)) ? 'rgba(255, 255, 255, 0.3)' : 'none'}
                            />
                        </button>
                        <button
                            onClick={handleOpenDelete}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: 'var(--error)' }}
                            aria-label={t('deleteAction')}
                            disabled={selectedIds.size === 0}
                        >
                            <Trash2 size={16} style={{ color: 'white' }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Transaction List with swipe support - reduced horizontal padding */}
            <div
                className="px-1.5 pb-1.5"
                onTouchStart={(e) => setRecientesTouchStart(e.targetTouches[0].clientX)}
                onTouchMove={(e) => setRecientesTouchEnd(e.targetTouches[0].clientX)}
                onTouchEnd={() => {
                    if (recientesTouchStart !== null && recientesTouchEnd !== null) {
                        const diff = recientesTouchStart - recientesTouchEnd;
                        const minSwipeDistance = 50;
                        if (diff > minSwipeDistance) {
                            goToRecientesSlide(recientesSlide === 0 ? 1 : 0, 'left');
                        } else if (diff < -minSwipeDistance) {
                            goToRecientesSlide(recientesSlide === 1 ? 0 : 1, 'right');
                        }
                    }
                    setRecientesTouchStart(null);
                    setRecientesTouchEnd(null);
                }}
            >
                {recentTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox size={36} className="mb-3 opacity-50" style={{ color: 'var(--secondary)' }} />
                        <p className="text-sm" style={{ color: 'var(--secondary)' }}>
                            {t('noRecentTransactions') || 'Sin transacciones recientes'}
                        </p>
                    </div>
                ) : (
                    <div
                        key={`recientes-list-${recientesAnimKey}`}
                        className="space-y-1"
                        style={{
                            animation: recientesSlideDirection
                                ? `${recientesSlideDirection === 'left' ? 'slideInFromRight' : 'slideInFromLeft'} 300ms ease-out`
                                : undefined
                        }}
                    >
                        {recentTransactions.map((tx, index) => (
                            <div
                                key={`${(tx as Transaction).id}-${recientesAnimKey}`}
                                className="animate-fade-in-left"
                                style={{
                                    opacity: 0,
                                    animationDelay: `${index * 80}ms`
                                }}
                            >
                                {renderTransactionItem(tx, index)}
                            </div>
                        ))}
                        {/* Story 14.41b: "See More" / "See Less" link at end of list */}
                        {canExpand && (
                            <div
                                key={`see-more-less-${recientesAnimKey}`}
                                className="flex justify-center pt-2 pb-1 animate-fade-in-left"
                                style={{
                                    opacity: 0,
                                    animationDelay: `${recentTransactions.length * 80}ms`
                                }}
                            >
                                <button
                                    onClick={() => setRecientesExpanded(!recientesExpanded)}
                                    className="text-sm font-medium flex items-center gap-1"
                                    style={{ color: 'var(--primary)' }}
                                    data-testid={recientesExpanded ? 'show-less-card' : 'see-more-card'}
                                >
                                    <span>
                                        {recientesExpanded
                                            ? (t('showLess') || 'Ver menos')
                                            : (t('seeMore') || 'Ver más')}
                                    </span>
                                    <span className="text-base font-bold">{recientesExpanded ? '−' : '+'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Indicator Bar (2 segments) - uses CSS variables for theme colors */}
            <div
                className="flex"
                style={{
                    backgroundColor: 'var(--border-light)',
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                    height: '6px',
                }}
                data-testid="recientes-indicator-bar"
            >
                {[0, 1].map((idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            if (idx !== recientesSlide) {
                                goToRecientesSlide(idx as 0 | 1, idx > recientesSlide ? 'left' : 'right');
                            }
                        }}
                        className="flex-1 h-full transition-colors"
                        style={{
                            backgroundColor: recientesSlide === idx
                                ? 'var(--border-medium, #d4a574)'
                                : 'transparent',
                            borderRadius: recientesSlide === idx
                                ? (idx === 0 ? '0 0 0 12px' : '0 0 12px 0')
                                : '0',
                        }}
                        aria-label={idx === 0 ? t('latestScanned') : t('byDate')}
                        data-testid={`recientes-indicator-${idx}`}
                    />
                ))}
            </div>
        </div>
    );
};
