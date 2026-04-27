/**
 * TrendsHeader - Sticky header for TrendsView
 *
 * Story 15b-2m: Extracted from TrendsView.tsx
 *
 * Contains: back button, "Explora" title, IconFilterBar, ProfileDropdown/Avatar,
 * time period pills (animated selector), period navigator with swipeable label.
 */

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProfileDropdown, ProfileAvatar, getInitials } from '@/components/ProfileDropdown';
import { IconFilterBar } from '@features/history/components/IconFilterBar';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
import type { DonutViewMode, TimePeriod } from './types';

export interface TrendsHeaderProps {
    onBack: () => void;
    locale: string;
    userName: string;
    userEmail: string;
    isProfileOpen: boolean;
    setIsProfileOpen: (open: boolean) => void;
    profileButtonRef: React.RefObject<HTMLButtonElement>;
    handleProfileNavigate: (view: string) => void;
    theme: string;
    t: (key: string) => string;
    availableFilters: AvailableFilters;
    donutViewMode: DonutViewMode;
    setDonutViewMode: (mode: DonutViewMode) => void;
    timePeriod: TimePeriod;
    handleTimePeriodClick: (period: TimePeriod) => void;
    isViewingCurrentPeriod: boolean;
    prefersReducedMotion: boolean;
    periodLabel: string;
    goPrevPeriod: () => void;
    goNextPeriod: () => void;
}

export const TrendsHeader: React.FC<TrendsHeaderProps> = ({
    onBack,
    locale,
    userName,
    userEmail,
    isProfileOpen,
    setIsProfileOpen,
    profileButtonRef,
    handleProfileNavigate,
    theme,
    t,
    availableFilters,
    donutViewMode,
    setDonutViewMode,
    timePeriod,
    handleTimePeriodClick,
    isViewingCurrentPeriod,
    prefersReducedMotion,
    periodLabel,
    goPrevPeriod,
    goNextPeriod,
}) => {
    const touchStartX = useRef(0);

    return (
        <div
            className="sticky px-4"
            style={{
                top: 0,
                zIndex: 50,
                backgroundColor: 'var(--bg)',
            }}
        >
            {/* Fixed height header row - matches HistoryView exactly (72px) */}
            <div
                className="flex items-center justify-between"
                style={{
                    height: '72px',
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                }}
            >
                {/* Left side: Back button + Title */}
                <div className="flex items-center gap-0">
                    {/* Back button - ChevronLeft style (same as HistoryView) */}
                    <button
                        onClick={onBack}
                        className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                        aria-label={locale === 'es' ? 'Volver' : 'Back'}
                        data-testid="back-button"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <ChevronLeft size={28} strokeWidth={2.5} />
                    </button>
                    <h1
                        className="font-semibold"
                        style={{
                            fontFamily: 'var(--font-family)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '20px',
                        }}
                    >
                        {t('analytics')}
                    </h1>
                </div>
                {/* Right side: Filters + Profile */}
                <div className="flex items-center gap-3 relative">
                    <IconFilterBar
                        availableFilters={availableFilters}
                        t={t}
                        locale={locale}
                        viewMode={donutViewMode}
                        onViewModeChange={setDonutViewMode}
                    />
                    <ProfileAvatar
                        ref={profileButtonRef}
                        initials={getInitials(userName)}
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    />
                    <ProfileDropdown
                        isOpen={isProfileOpen}
                        onClose={() => setIsProfileOpen(false)}
                        userName={userName}
                        userEmail={userEmail}
                        onNavigate={handleProfileNavigate}
                        theme={theme}
                        t={t}
                        triggerRef={profileButtonRef}
                    />
                </div>
            </div>

            {/* Time Period Pills with Animated Selection Indicator (AC #2) */}
            <div className="px-2 pt-1 pb-0">
                <div
                    className="relative flex justify-center rounded-full p-1"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                    }}
                    role="tablist"
                    aria-label="Time period selection"
                    data-testid="time-pills-container"
                >
                    {/* Animated selection indicator */}
                    <div
                        className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out ${
                            prefersReducedMotion ? '' : 'transform'
                        }`}
                        style={{
                            width: 'calc((100% - 8px) / 4)',
                            left: timePeriod === 'year' ? '4px' :
                                  timePeriod === 'quarter' ? 'calc(4px + (100% - 8px) * 0.25)' :
                                  timePeriod === 'month' ? 'calc(4px + (100% - 8px) * 0.5)' :
                                  'calc(4px + (100% - 8px) * 0.75)',
                            background: 'var(--primary, #2563eb)',
                        }}
                        aria-hidden="true"
                    />
                    {/* Pills - Order: Year → Quarter → Month → Week (largest to smallest) */}
                    {(['year', 'quarter', 'month', 'week'] as TimePeriod[]).map((period) => {
                        const labels: Record<TimePeriod, { es: string; en: string }> = {
                            year: { es: 'Año', en: 'Year' },
                            quarter: { es: 'Trimestre', en: 'Quarter' },
                            month: { es: 'Mes', en: 'Month' },
                            week: { es: 'Semana', en: 'Week' },
                        };
                        const isActive = timePeriod === period;
                        const showPastIndicator = isActive && !isViewingCurrentPeriod;
                        return (
                            <button
                                key={period}
                                onClick={() => handleTimePeriodClick(period)}
                                className="relative z-10 flex-1 px-2 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                                style={{
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                }}
                                aria-pressed={isActive}
                                data-testid={`time-pill-${period}`}
                            >
                                {locale === 'es' ? labels[period].es : labels[period].en}
                                {showPastIndicator && <span className="ml-0.5" data-testid="past-indicator">·</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Period Navigator (AC #3) - Tight spacing from pills */}
            <div className="px-4 py-1">
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={goPrevPeriod}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                        }}
                        aria-label="Previous period"
                        data-testid="period-nav-prev"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {/* Swipeable period label */}
                    <span
                        onTouchStart={(e) => {
                            touchStartX.current = e.touches[0].clientX;
                        }}
                        onTouchEnd={(e) => {
                            const diffX = e.changedTouches[0].clientX - touchStartX.current;
                            if (Math.abs(diffX) >= 30) {
                                if (diffX < 0) {
                                    goNextPeriod();
                                } else {
                                    goPrevPeriod();
                                }
                            }
                        }}
                        className="text-base font-medium min-w-[160px] text-center cursor-grab select-none"
                        style={{
                            touchAction: 'pan-y',
                            color: 'var(--text-primary)',
                        }}
                        data-testid="period-label"
                    >
                        {periodLabel}
                    </span>
                    <button
                        onClick={goNextPeriod}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                        }}
                        aria-label="Next period"
                        data-testid="period-nav-next"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
