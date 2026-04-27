import React from 'react';
import { ChevronLeft, ChevronRight, Receipt, Package } from 'lucide-react';
import { VIEW_MODE_CONFIG, type TreemapViewMode } from './types';

export interface DashboardCarouselHeaderProps {
    formattedMonthName: string;
    prevMonthName: string;
    nextMonthName: string;
    isViewingCurrentMonth: boolean;
    canGoToNextMonth: boolean;
    goToCurrentMonth: () => void;
    monthSwipeOffset: number;
    monthTouchStart: number | null;
    onMonthTouchStart: (e: React.TouchEvent) => void;
    onMonthTouchMove: (e: React.TouchEvent) => void;
    onMonthTouchEnd: () => void;
    treemapViewMode: TreemapViewMode;
    onViewModeChange: (mode: TreemapViewMode) => void;
    lang: string;
    countMode: 'transactions' | 'items';
    toggleCountMode: () => void;
}

export const DashboardCarouselHeader: React.FC<DashboardCarouselHeaderProps> = ({
    formattedMonthName,
    prevMonthName,
    nextMonthName,
    isViewingCurrentMonth,
    canGoToNextMonth,
    goToCurrentMonth,
    monthSwipeOffset,
    monthTouchStart,
    onMonthTouchStart,
    onMonthTouchMove,
    onMonthTouchEnd,
    treemapViewMode,
    onViewModeChange,
    lang,
    countMode,
    toggleCountMode,
}) => {
    return (
        <div className="relative flex justify-between items-center p-3 pb-0">
            {/* Left-aligned month with swipe navigation and chevron hints */}
            <div
                className="relative flex items-center cursor-pointer select-none"
                style={{
                    touchAction: 'pan-y',
                    height: '24px',
                    marginLeft: '-4px',
                }}
                data-testid="carousel-title"
                onTouchStart={onMonthTouchStart}
                onTouchMove={onMonthTouchMove}
                onTouchEnd={onMonthTouchEnd}
                onClick={!isViewingCurrentMonth ? goToCurrentMonth : undefined}
            >
                <ChevronLeft
                    size={12}
                    strokeWidth={2}
                    style={{
                        color: 'var(--text-tertiary)',
                        opacity: 0.4,
                    }}
                />
                <div
                    className="relative overflow-hidden flex items-center justify-center"
                    style={{ width: '54px', height: '100%' }}
                >
                    <span
                        className="absolute font-semibold whitespace-nowrap text-sm"
                        style={{
                            color: 'var(--text-primary)',
                            transform: `translateX(${monthSwipeOffset - 54}px)`,
                            transition: monthTouchStart === null ? 'transform 0.2s ease-out' : 'none',
                            opacity: monthSwipeOffset > 0 ? Math.min(monthSwipeOffset / 50, 1) : 0,
                        }}
                    >
                        {prevMonthName}
                    </span>
                    <span
                        className="absolute font-semibold whitespace-nowrap text-sm"
                        style={{
                            color: 'var(--text-primary)',
                            transform: `translateX(${monthSwipeOffset}px)`,
                            transition: monthTouchStart === null ? 'transform 0.2s ease-out' : 'none',
                        }}
                    >
                        {formattedMonthName}
                        {!isViewingCurrentMonth && (
                            <span style={{ marginLeft: '2px', color: 'var(--primary)' }}>·</span>
                        )}
                    </span>
                    <span
                        className="absolute font-semibold whitespace-nowrap text-sm"
                        style={{
                            color: 'var(--text-primary)',
                            transform: `translateX(${monthSwipeOffset + 54}px)`,
                            transition: monthTouchStart === null ? 'transform 0.2s ease-out' : 'none',
                            opacity: monthSwipeOffset < 0 ? Math.min(-monthSwipeOffset / 50, 1) : 0,
                        }}
                    >
                        {nextMonthName}
                    </span>
                </div>
                <ChevronRight
                    size={12}
                    strokeWidth={2}
                    style={{
                        color: 'var(--text-tertiary)',
                        opacity: canGoToNextMonth ? 0.4 : 0.15,
                    }}
                />
            </div>

            {/* View mode selector - absolutely centered */}
            <div
                className="absolute left-1/2 transform -translate-x-1/2 flex items-center"
                style={{ top: '12px' }}
            >
                <div
                    className="relative flex items-center rounded-full"
                    style={{
                        backgroundColor: 'var(--bg-tertiary, #f1f5f9)',
                        height: '32px',
                        padding: '2px 4px',
                        border: '1px solid var(--border-light, #e2e8f0)',
                        gap: '4px',
                    }}
                    role="tablist"
                    aria-label="View mode selection"
                    data-testid="viewmode-pills-container"
                >
                    <div
                        className="absolute rounded-full transition-all duration-300 ease-out"
                        style={{
                            width: '28px',
                            height: '28px',
                            top: '2px',
                            left: treemapViewMode === 'store-groups' ? '4px' :
                                  treemapViewMode === 'store-categories' ? 'calc(4px + 32px)' :
                                  treemapViewMode === 'item-groups' ? 'calc(4px + 64px)' :
                                  'calc(4px + 96px)',
                            background: 'var(--primary, #2563eb)',
                        }}
                        aria-hidden="true"
                    />
                    {VIEW_MODE_CONFIG.map((mode) => {
                        const isActive = treemapViewMode === mode.value;
                        return (
                            <button
                                key={mode.value}
                                onClick={() => onViewModeChange(mode.value)}
                                className="relative z-10 flex items-center justify-center rounded-full transition-colors"
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    lineHeight: 1,
                                }}
                                aria-pressed={isActive}
                                aria-label={lang === 'es' ? mode.labelEs : mode.labelEn}
                                title={lang === 'es' ? mode.labelEs : mode.labelEn}
                                data-testid={`viewmode-pill-${mode.value}`}
                            >
                                <span
                                    className="text-base leading-none transition-all"
                                    style={{
                                        filter: isActive ? 'brightness(1.2)' : 'none',
                                    }}
                                >
                                    {mode.emoji}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Count Mode Toggle */}
            <div className="flex items-center gap-1 z-10">
                <button
                    onClick={toggleCountMode}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                    aria-label={countMode === 'transactions'
                        ? (lang === 'es' ? 'Contando compras (clic para contar productos)' : 'Counting purchases (click to count products)')
                        : (lang === 'es' ? 'Contando productos (clic para contar compras)' : 'Counting products (click to count purchases)')
                    }
                    title={countMode === 'transactions'
                        ? (lang === 'es' ? 'Contando compras' : 'Counting purchases')
                        : (lang === 'es' ? 'Contando productos' : 'Counting products')
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
            </div>
        </div>
    );
};
