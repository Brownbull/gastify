/**
 * TrendsCardHeader - Analytics card header with view controls
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Contains:
 * - View toggle button (donut/treemap vs list/sankey)
 * - View mode pill selector (4-pill donut mode or 2-pill Sankey mode)
 * - Count mode toggle (transactions vs products)
 * - Sankey navigation buttons
 */

import React from 'react';
import { ChevronLeft, ChevronRight, PieChart, LayoutGrid, Receipt, Package, GitBranch, List } from 'lucide-react';
import type { SankeyMode } from '@features/analytics/utils/sankeyDataBuilder';
import type { CarouselSlide, DistributionView, TendenciaView, DonutViewMode } from './types';

export interface TrendsCardHeaderProps {
    carouselSlide: CarouselSlide;
    distributionView: DistributionView;
    tendenciaView: TendenciaView;
    toggleView: () => void;
    prefersReducedMotion: boolean;
    donutViewMode: DonutViewMode;
    setDonutViewMode: (mode: DonutViewMode) => void;
    sankeyMode: SankeyMode;
    setSankeyMode: (mode: SankeyMode) => void;
    locale: string;
    countMode: 'transactions' | 'items';
    toggleCountMode: () => void;
    goToPrevSlide: () => void;
    goToNextSlide: () => void;
    carouselTitles: readonly string[];
}

export const TrendsCardHeader: React.FC<TrendsCardHeaderProps> = ({
    carouselSlide,
    distributionView,
    tendenciaView,
    toggleView,
    prefersReducedMotion,
    donutViewMode,
    setDonutViewMode,
    sankeyMode,
    setSankeyMode,
    locale,
    countMode,
    toggleCountMode,
    goToPrevSlide,
    goToNextSlide,
    carouselTitles,
}) => {
    return (
        <div className="relative flex items-center justify-between px-3 pt-3 pb-2">
            {/* Left side buttons container */}
            <div className="flex items-center gap-1.5 z-10">
                {/* View Toggle Button (AC #7) with icon morphing animation */}
                <button
                    onClick={toggleView}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                    aria-label="Toggle view"
                    data-testid="view-toggle"
                    style={{
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        backgroundColor: carouselSlide === 0 && distributionView === 'donut'
                            ? 'var(--primary)'
                            : 'var(--bg-tertiary)',
                        color: carouselSlide === 0 && distributionView === 'donut'
                            ? 'white'
                            : 'var(--text-secondary)',
                    }}
                >
                    <span
                        className="inline-flex transition-transform duration-200 ease-out"
                        style={{
                            transform: prefersReducedMotion ? 'none' : 'rotate(0deg)',
                        }}
                        key={`${carouselSlide}-${distributionView}-${tendenciaView}`}
                    >
                        {carouselSlide === 0 ? (
                            distributionView === 'treemap' ? (
                                <PieChart size={16} className="transition-opacity duration-150" />
                            ) : (
                                <LayoutGrid size={16} className="transition-opacity duration-150" />
                            )
                        ) : (
                            // Story 14.13.3: Sankey toggle - show flow icon when on list, list icon when on sankey
                            tendenciaView === 'list' ? (
                                <GitBranch size={16} className="transition-opacity duration-150" />
                            ) : (
                                <List size={16} className="transition-opacity duration-150" />
                            )
                        )}
                    </span>
                </button>

                </div>

            {/* Story 14.14b Session 5: View mode pills for all carousel slides */}
            {/* Story 14.13.3 Phase 5: Show 2 icons for Sankey view, 4 icons for other views */}
            {(carouselSlide === 0 || carouselSlide === 1) ? (
                <div
                    className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center"
                    data-testid="viewmode-pills-wrapper"
                >
                    {/* Outer container pill - height matches left button (32px) */}
                    <div
                        className="relative flex items-center rounded-full"
                        style={{
                            backgroundColor: 'var(--bg-tertiary, #f1f5f9)',
                            height: '32px',
                            padding: '2px 4px',
                            border: '1px solid var(--border-light, #e2e8f0)',
                            gap: '6px',
                        }}
                        role="tablist"
                        aria-label="View mode selection"
                        data-testid="viewmode-pills-container"
                    >
                        {/* Story 14.13.3 Phase 5: Sankey mode pills (2 icons) when on Sankey view */}
                        {carouselSlide === 1 && tendenciaView === 'sankey' ? (
                            <>
                                {/* Animated selection indicator for Sankey (2 pills) */}
                                <div
                                    className={`absolute rounded-full transition-all duration-300 ease-out ${
                                        prefersReducedMotion ? '' : 'transform'
                                    }`}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        top: '2px',
                                        left: sankeyMode === '3-level-groups' ? '4px' : 'calc(4px + 34px)',
                                        background: 'var(--primary, #2563eb)',
                                    }}
                                    aria-hidden="true"
                                />
                                {/* Sankey mode pills - 2 icons */}
                                {([
                                    { value: '3-level-groups' as SankeyMode, emoji: '\u{1F3EA}', labelEs: 'Grupos \u2192 Categor\u00edas \u2192 Productos', labelEn: 'Groups \u2192 Categories \u2192 Products' },
                                    { value: '3-level-categories' as SankeyMode, emoji: '\u{1F6D2}', labelEs: 'Compras \u2192 Grupos \u2192 Items', labelEn: 'Purchases \u2192 Groups \u2192 Items' },
                                ]).map((mode) => {
                                    const isActive = sankeyMode === mode.value;
                                    return (
                                        <button
                                            key={mode.value}
                                            onClick={() => setSankeyMode(mode.value)}
                                            className="relative z-10 flex items-center justify-center rounded-full transition-colors"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                lineHeight: 1,
                                            }}
                                            aria-pressed={isActive}
                                            aria-label={locale === 'es' ? mode.labelEs : mode.labelEn}
                                            title={locale === 'es' ? mode.labelEs : mode.labelEn}
                                            data-testid={`sankey-mode-pill-${mode.value}`}
                                        >
                                            <span
                                                className="text-lg leading-none transition-all"
                                                style={{
                                                    filter: isActive ? 'brightness(1.2)' : 'none',
                                                }}
                                            >
                                                {mode.emoji}
                                            </span>
                                        </button>
                                    );
                                })}
                            </>
                        ) : (
                            <>
                                {/* Animated selection indicator for Donut (4 pills) */}
                                <div
                                    className={`absolute rounded-full transition-all duration-300 ease-out ${
                                        prefersReducedMotion ? '' : 'transform'
                                    }`}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        top: '2px',
                                        // 4px initial padding + (28px button + 6px gap) * index
                                        left: donutViewMode === 'store-groups' ? '4px' :
                                              donutViewMode === 'store-categories' ? 'calc(4px + 34px)' :
                                              donutViewMode === 'item-groups' ? 'calc(4px + 68px)' :
                                              'calc(4px + 102px)',
                                        background: 'var(--primary, #2563eb)',
                                    }}
                                    aria-hidden="true"
                                />
                                {/* View mode pills with icons only (4 icons for Donut/List views) */}
                                {([
                                    { value: 'store-groups' as DonutViewMode, emoji: '\u{1F3EA}', labelEs: 'Grupos de Compras', labelEn: 'Purchase Groups' },
                                    { value: 'store-categories' as DonutViewMode, emoji: '\u{1F6D2}', labelEs: 'Categor\u00edas de Compras', labelEn: 'Purchase Categories' },
                                    { value: 'item-groups' as DonutViewMode, emoji: '\u{1F4E6}', labelEs: 'Grupos de Productos', labelEn: 'Product Groups' },
                                    { value: 'item-categories' as DonutViewMode, emoji: '\u{1F3F7}\uFE0F', labelEs: 'Categor\u00edas de Productos', labelEn: 'Product Categories' },
                                ]).map((mode) => {
                                    const isActive = donutViewMode === mode.value;
                                    return (
                                        <button
                                            key={mode.value}
                                            onClick={() => setDonutViewMode(mode.value)}
                                            className="relative z-10 flex items-center justify-center rounded-full transition-colors"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                lineHeight: 1,
                                            }}
                                            aria-pressed={isActive}
                                            aria-label={locale === 'es' ? mode.labelEs : mode.labelEn}
                                            title={locale === 'es' ? mode.labelEs : mode.labelEn}
                                            data-testid={`viewmode-pill-${mode.value}`}
                                        >
                                            <span
                                                className="text-lg leading-none transition-all"
                                                style={{
                                                    filter: isActive ? 'brightness(1.2)' : 'none',
                                                }}
                                            >
                                                {mode.emoji}
                                            </span>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <span
                    className="absolute left-1/2 transform -translate-x-1/2 font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                    data-testid="carousel-title"
                >
                    {carouselTitles[carouselSlide]}
                </span>
            )}

            {/* Right side buttons - Story 14.13.3: Show nav buttons for Sankey, count toggle for others */}
            <div className="flex items-center gap-1 z-10">
                {carouselSlide === 1 && tendenciaView === 'sankey' ? (
                    <>
                        {/* Story 14.13.3: Left/Right buttons NOW navigate carousel slides (swipe scrolls diagram) */}
                        {/* Enhanced styling with border and pulse animation to draw attention */}
                        <button
                            onClick={goToPrevSlide}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                            aria-label={locale === 'es' ? 'Ir al slide anterior' : 'Go to previous slide'}
                            title={locale === 'es' ? 'Anterior' : 'Previous'}
                            data-testid="sankey-nav-left"
                            style={{
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--primary)',
                                border: '2px solid var(--primary)',
                                animation: prefersReducedMotion ? 'none' : 'sankey-nav-pulse 2s ease-in-out infinite',
                            }}
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={goToNextSlide}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                            aria-label={locale === 'es' ? 'Ir al siguiente slide' : 'Go to next slide'}
                            title={locale === 'es' ? 'Siguiente' : 'Next'}
                            data-testid="sankey-nav-right"
                            style={{
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                backgroundColor: 'var(--bg)',
                                color: 'var(--primary)',
                                border: '2px solid var(--primary)',
                                animation: prefersReducedMotion ? 'none' : 'sankey-nav-pulse 2s ease-in-out infinite 0.3s',
                            }}
                        >
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                        {/* Keyframe animation for pulse effect */}
                        <style>{`
                            @keyframes sankey-nav-pulse {
                                0%, 100% { transform: scale(1); }
                                50% { transform: scale(1.05); }
                            }
                        `}</style>
                    </>
                ) : (
                    /* Count Mode Toggle Button for other views */
                    <button
                        onClick={toggleCountMode}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                        aria-label={countMode === 'transactions'
                            ? (locale === 'es' ? 'Contando transacciones (clic para contar productos)' : 'Counting transactions (click to count products)')
                            : (locale === 'es' ? 'Contando productos (clic para contar transacciones)' : 'Counting products (click to count transactions)')
                        }
                        title={countMode === 'transactions'
                            ? (locale === 'es' ? 'Contando compras' : 'Counting purchases')
                            : (locale === 'es' ? 'Contando productos' : 'Counting products')
                        }
                        data-testid="count-mode-toggle"
                        style={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            backgroundColor: countMode === 'items'
                                ? 'var(--primary)'
                                : 'var(--bg-tertiary)',
                            color: countMode === 'items'
                                ? 'white'
                                : 'var(--text-secondary)',
                        }}
                    >
                        {countMode === 'transactions' ? (
                            <Receipt size={16} className="transition-opacity duration-150" />
                        ) : (
                            <Package size={16} className="transition-opacity duration-150" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
