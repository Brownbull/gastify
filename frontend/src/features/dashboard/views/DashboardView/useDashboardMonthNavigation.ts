import { useState, useMemo, useCallback } from 'react';

/** Props for useDashboardMonthNavigation hook. */
export interface UseDashboardMonthNavigationProps {
    lang: string;
    formatCurrency: (amount: number, currency: string) => string;
    currency: string;
    resetSlideState: () => void;
}

/** Return type for useDashboardMonthNavigation hook. */
export interface UseDashboardMonthNavigationReturn {
    selectedMonth: { year: number; month: number };
    setSelectedMonth: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>;
    selectedMonthString: string;
    goToPrevMonth: () => void;
    goToNextMonth: () => void;
    goToCurrentMonth: () => void;
    isViewingCurrentMonth: boolean;
    canGoToNextMonth: boolean;
    formatMonth: (month: number, year: number) => string;
    formattedMonthName: string;
    formatCompactAmount: (amount: number) => string;
    prevMonthName: string;
    nextMonthName: string;
    monthTouchStart: number | null;
    monthSwipeOffset: number;
    onMonthTouchStart: (e: React.TouchEvent) => void;
    onMonthTouchMove: (e: React.TouchEvent) => void;
    onMonthTouchEnd: () => void;
}

const MIN_SWIPE_DISTANCE = 50;

export function useDashboardMonthNavigation({
    lang,
    formatCurrency,
    currency,
    resetSlideState,
}: UseDashboardMonthNavigationProps): UseDashboardMonthNavigationReturn {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const [monthTouchStart, setMonthTouchStart] = useState<number | null>(null);
    const [monthSwipeOffset, setMonthSwipeOffset] = useState(0);

    const selectedMonthString = useMemo(() => {
        const month = String(selectedMonth.month + 1).padStart(2, '0');
        return `${selectedMonth.year}-${month}`;
    }, [selectedMonth]);

    const goToPrevMonth = useCallback(() => {
        setSelectedMonth(prev => {
            const newMonth = prev.month === 0 ? 11 : prev.month - 1;
            const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
            return { year: newYear, month: newMonth };
        });
        resetSlideState();
    }, [resetSlideState]);

    const goToNextMonth = useCallback(() => {
        const now = new Date();
        setSelectedMonth(prev => {
            const newMonth = prev.month === 11 ? 0 : prev.month + 1;
            const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
            const isFuture = newYear > now.getFullYear() ||
                (newYear === now.getFullYear() && newMonth > now.getMonth());
            if (isFuture) return prev;
            return { year: newYear, month: newMonth };
        });
        resetSlideState();
    }, [resetSlideState]);

    const goToCurrentMonth = useCallback(() => {
        const now = new Date();
        setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() });
        resetSlideState();
    }, [resetSlideState]);

    const isViewingCurrentMonth = useMemo(() => {
        const now = new Date();
        return selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();
    }, [selectedMonth]);

    const canGoToNextMonth = useMemo(() => {
        const now = new Date();
        const nextMonth = selectedMonth.month === 11 ? 0 : selectedMonth.month + 1;
        const nextYear = selectedMonth.month === 11 ? selectedMonth.year + 1 : selectedMonth.year;
        return !(nextYear > now.getFullYear() ||
            (nextYear === now.getFullYear() && nextMonth > now.getMonth()));
    }, [selectedMonth]);

    const formatMonth = useCallback((month: number, year: number) => {
        const monthNames = lang === 'es'
            ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic']
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const shortYear = year.toString().slice(-2);
        return `${monthNames[month]} '${shortYear}`;
    }, [lang]);

    const formattedMonthName = useMemo(() => {
        return formatMonth(selectedMonth.month, selectedMonth.year);
    }, [selectedMonth, formatMonth]);

    const formatCompactAmount = useCallback(
        (amount: number) => `${formatCurrency(Math.round(amount / 1000), currency).replace(/\s/g, '')}k`,
        [formatCurrency, currency]
    );

    const prevMonthName = useMemo(() => {
        const prevMonth = selectedMonth.month === 0 ? 11 : selectedMonth.month - 1;
        const prevYear = selectedMonth.month === 0 ? selectedMonth.year - 1 : selectedMonth.year;
        return formatMonth(prevMonth, prevYear);
    }, [selectedMonth, formatMonth]);

    const nextMonthName = useMemo(() => {
        const nextMonth = selectedMonth.month === 11 ? 0 : selectedMonth.month + 1;
        const nextYear = selectedMonth.month === 11 ? selectedMonth.year + 1 : selectedMonth.year;
        return formatMonth(nextMonth, nextYear);
    }, [selectedMonth, formatMonth]);

    const onMonthTouchStart = (e: React.TouchEvent) => {
        if (!e.targetTouches || e.targetTouches.length === 0) return;
        setMonthTouchStart(e.targetTouches[0].clientX);
        setMonthSwipeOffset(0);
    };

    const onMonthTouchMove = (e: React.TouchEvent) => {
        if (monthTouchStart === null) return;
        if (!e.targetTouches || e.targetTouches.length === 0) return;
        const currentX = e.targetTouches[0].clientX;
        const offset = currentX - monthTouchStart;
        if (offset < 0 && !canGoToNextMonth) {
            setMonthSwipeOffset(offset * 0.2);
        } else {
            setMonthSwipeOffset(offset);
        }
    };

    const onMonthTouchEnd = () => {
        if (monthTouchStart === null) return;
        const distance = -monthSwipeOffset;
        const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
        const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

        if (isLeftSwipe && canGoToNextMonth) {
            goToNextMonth();
        } else if (isRightSwipe) {
            goToPrevMonth();
        }

        setMonthTouchStart(null);
        setMonthSwipeOffset(0);
    };

    return {
        selectedMonth,
        setSelectedMonth,
        selectedMonthString,
        goToPrevMonth,
        goToNextMonth,
        goToCurrentMonth,
        isViewingCurrentMonth,
        canGoToNextMonth,
        formatMonth,
        formattedMonthName,
        formatCompactAmount,
        prevMonthName,
        nextMonthName,
        monthTouchStart,
        monthSwipeOffset,
        onMonthTouchStart,
        onMonthTouchMove,
        onMonthTouchEnd,
    };
}
