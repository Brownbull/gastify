/**
 * InsightsView - Insight History Panel
 *
 * Story 10a.4: Insights History View
 * @see docs/sprint-artifacts/epic10a/story-10a.4-insights-history-view.md
 *
 * Story 14.33b: View Switcher & Carousel Mode
 * @see docs/sprint-artifacts/epic14/stories/story-14.33b-view-switcher-carousel.md
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * Displays chronological list of past insights with temporal filtering.
 * Now includes 4-mode view switcher: List, Carousel, Airlock, Celebration.
 *
 * AC1: Insights list renders with icon, title, message, date
 * AC2: Grouped by week (This Week, Last Week, Earlier)
 * AC3: Insight card display with all fields
 * AC4: Navigate to transaction on tap (via modal)
 * AC5: Empty state with suggestion to scan
 * AC6: Backward compatibility for old records
 *
 * Story 14.33b:
 * AC1: View switcher with 4 buttons (Lista, Destacados, Airlock, Logro)
 * AC2: View state management with localStorage persistence
 * AC3: Carousel view for highlighted insights
 * AC6: Placeholder views for Airlock and Celebration
 *
 * Story 14.33c.1:
 * AC2: Generate Airlock Button with credit integration
 * AC5: Airlock History List
 * AC6: Airlock Card opens AirlockSequence
 *
 * Enhancement: Temporal filters + Detail modal on click
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, Lightbulb, Trash2, X } from 'lucide-react';
import { useInsightProfileRepository } from '@/repositories';
import { InsightHistoryCard } from '@features/insights/components/InsightHistoryCard';
import { InsightDetailModal } from '@features/insights/components/InsightDetailModal';
import {
  InsightsTemporalFilter,
  type InsightTemporalFilter,
} from '@features/insights/components/InsightsTemporalFilter';
import {
  InsightsViewSwitcher,
  InsightsViewMode,
} from '@features/insights/components/InsightsViewSwitcher';
import { InsightsCarousel, selectHighlightedInsights } from '@features/insights/components/InsightsCarousel';
import { CelebrationView } from '@features/insights/components/CelebrationView';
import { InsightRecord } from '@/types/insight';
import { useAuth } from '@/hooks/useAuth';
import { useInsightProfile } from '@features/insights/hooks/useInsightProfile';
import { getISOWeekNumber } from '@/utils/date';
import { getStorageString, setStorageString } from '@/utils/storage';
import { toDateSafe } from '@/utils/timestamp';

/** Long press delay for batch selection activation. */
const LONG_PRESS_DELAY_MS = 500;
import { ProfileDropdown, ProfileAvatar, getInitials } from '@/components/ProfileDropdown';
// Story 14e-25c.2: Navigation via Zustand store
import { useNavigation } from '@shared/stores/useNavigationStore';
import type { View } from '@app/types';

// localStorage key for view preference persistence
const INSIGHTS_VIEW_KEY = 'boletapp_insights_view';

/**
 * Story 14e-25c.2: Minimal props interface for InsightsView.
 * Navigation callbacks migrated to useNavigation() hook.
 * onEditTransaction remains as prop (requires App.tsx coordination).
 */
export interface InsightsViewProps {
  /** Navigate to edit a specific transaction */
  onEditTransaction: (transactionId: string) => void;
  /** Theme for styling */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
}

// Group insights by week (AC2)
type InsightGroup = {
  label: string;
  labelKey: string; // Translation key for i18n
  insights: InsightRecord[];
};

/**
 * Groups insights into "This Week", "Last Week", and "Earlier" buckets.
 * Insights are assumed to already be sorted by date descending.
 */
function groupByWeek(insights: InsightRecord[], t: (key: string) => string): InsightGroup[] {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek: InsightRecord[] = [];
  const lastWeek: InsightRecord[] = [];
  const earlier: InsightRecord[] = [];

  insights.forEach((insight) => {
    const date = toDateSafe(insight.shownAt);
    if (!date) {
      earlier.push(insight);
      return;
    }

    if (date >= oneWeekAgo) {
      thisWeek.push(insight);
    } else if (date >= twoWeeksAgo) {
      lastWeek.push(insight);
    } else {
      earlier.push(insight);
    }
  });

  const groups: InsightGroup[] = [];
  if (thisWeek.length > 0) {
    groups.push({ label: t('thisWeek') || 'This Week', labelKey: 'thisWeek', insights: thisWeek });
  }
  if (lastWeek.length > 0) {
    groups.push({ label: t('lastWeek') || 'Last Week', labelKey: 'lastWeek', insights: lastWeek });
  }
  if (earlier.length > 0) {
    groups.push({ label: t('earlier') || 'Earlier', labelKey: 'earlier', insights: earlier });
  }

  return groups;
}

/**
 * Filters insights based on temporal filter settings.
 */
function filterInsightsByTemporal(
  insights: InsightRecord[],
  filter: InsightTemporalFilter
): InsightRecord[] {
  if (filter.level === 'all') return insights;

  return insights.filter((insight) => {
    try {
      const date = toDateSafe(insight.shownAt);
      if (!date) return false;

      const year = date.getFullYear();
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1;

      // Get ISO week number using shared utility
      const week = getISOWeekNumber(date);

      if (filter.level === 'year') {
        return year === filter.year;
      }
      if (filter.level === 'quarter') {
        return year === filter.year && quarter === filter.quarter;
      }
      if (filter.level === 'month') {
        return year === filter.year && month === filter.month;
      }
      if (filter.level === 'week') {
        return year === filter.year && month === filter.month && week === filter.week;
      }
      return true;
    } catch {
      return false;
    }
  });
}

// Unique key for an insight (for selection tracking)
type InsightKey = string;
function getInsightKey(insight: InsightRecord): InsightKey {
  return `${insight.insightId}:${insight.shownAt?.seconds ?? 0}`;
}

/**
 * Load saved view preference from localStorage
 */
function loadSavedView(): InsightsViewMode {
  const saved = getStorageString(INSIGHTS_VIEW_KEY, 'list');
  if (['list', 'airlock', 'celebration'].includes(saved)) {
    return saved as InsightsViewMode;
  }
  // If user had 'carousel' saved, redirect to 'list' (now includes highlighted section)
  if (saved === 'carousel') {
    return 'list';
  }
  return 'list';
}

function saveViewPreference(view: InsightsViewMode): void {
  setStorageString(INSIGHTS_VIEW_KEY, view);
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  onEditTransaction,
  theme,
  t,
}) => {
  // Story 14e-25c.2: Get navigation from Zustand store
  const { navigateBack, navigateToView } = useNavigation();

  const { user, services } = useAuth();
  const insightProfileRepo = useInsightProfileRepository();

  // Story 14e-25c.2: User info from auth instead of props
  const userName = user?.displayName ?? '';
  const userEmail = user?.email ?? '';
  const { removeInsight, removeInsights } = useInsightProfile(user, services);
  const [insights, setInsights] = useState<InsightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [temporalFilter, setTemporalFilter] = useState<InsightTemporalFilter>({ level: 'all' });
  const [selectedInsight, setSelectedInsight] = useState<InsightRecord | null>(null);

  // Story 14.33b: View switcher state with localStorage persistence (AC2)
  const [activeView, setActiveView] = useState<InsightsViewMode>(loadSavedView);

  // Batch selection state (only for list view)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<InsightKey>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Story 14e-25c.2: Handle profile navigation via Zustand store
  const handleProfileNavigate = useCallback((view: string) => {
    navigateToView(view as View);
  }, [navigateToView]);

  const initials = getInitials(userName);

  // Story 14.33b: Handle view change with persistence
  const handleViewChange = useCallback((view: InsightsViewMode) => {
    setActiveView(view);
    saveViewPreference(view);
    // Exit selection mode when switching views
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedKeys(new Set());
    }
  }, [selectionMode]);


  useEffect(() => {
    async function loadInsights() {
      if (!user || !services || !insightProfileRepo) {
        setLoading(false);
        return;
      }
      try {
        const profile = await insightProfileRepo.get();
        if (profile?.recentInsights) {
          // Sort by date descending (most recent first)
          const sorted = [...profile.recentInsights].sort((a, b) => {
            try {
              const aTime = a.shownAt?.toDate?.()?.getTime?.() ?? 0;
              const bTime = b.shownAt?.toDate?.()?.getTime?.() ?? 0;
              return bTime - aTime;
            } catch {
              return 0;
            }
          });
          setInsights(sorted);
        }
      } catch (error) {
        console.error('Failed to load insights:', error);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, [user, services, insightProfileRepo]);

  // Apply temporal filter
  const filteredInsights = useMemo(
    () => filterInsightsByTemporal(insights, temporalFilter),
    [insights, temporalFilter]
  );

  // Group filtered insights by week
  const groupedInsights = useMemo(
    () => groupByWeek(filteredInsights, t),
    [filteredInsights, t]
  );

  // Long press handling for batch selection
  const handleLongPressStart = useCallback((insight: InsightRecord) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectionMode(true);
      setSelectedKeys(new Set([getInsightKey(insight)]));
    }, LONG_PRESS_DELAY_MS);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Handle insight click - either toggle selection or show modal
  const handleInsightClick = useCallback((insight: InsightRecord) => {
    // If long press was triggered, don't open modal
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (selectionMode) {
      // Toggle selection
      const key = getInsightKey(insight);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } else {
      setSelectedInsight(insight);
    }
  }, [selectionMode]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedInsight(null);
  }, []);

  // Navigate to transaction from modal
  const handleNavigateToTransaction = useCallback(() => {
    if (selectedInsight?.transactionId) {
      onEditTransaction(selectedInsight.transactionId);
      setSelectedInsight(null);
    }
  }, [selectedInsight, onEditTransaction]);

  // Delete single insight from modal
  const handleDeleteInsight = useCallback(async () => {
    if (!selectedInsight) return;
    await removeInsight(
      selectedInsight.insightId,
      selectedInsight.shownAt?.seconds ?? 0
    );
    // Update local state
    setInsights((prev) =>
      prev.filter((i) => getInsightKey(i) !== getInsightKey(selectedInsight))
    );
  }, [selectedInsight, removeInsight]);

  // Delete selected insights (batch)
  const handleDeleteSelected = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    setIsDeleting(true);
    try {
      // Build list of insights to delete
      const toDelete = insights
        .filter((i) => selectedKeys.has(getInsightKey(i)))
        .map((i) => ({
          insightId: i.insightId,
          shownAtSeconds: i.shownAt?.seconds ?? 0,
        }));

      await removeInsights(toDelete);

      // Update local state
      setInsights((prev) =>
        prev.filter((i) => !selectedKeys.has(getInsightKey(i)))
      );
      setSelectedKeys(new Set());
      setSelectionMode(false);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedKeys, insights, removeInsights]);

  // Exit selection mode
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedKeys(new Set());
  }, []);

  // Select all filtered insights
  const handleSelectAll = useCallback(() => {
    const allKeys = new Set(filteredInsights.map(getInsightKey));
    setSelectedKeys(allKeys);
  }, [filteredInsights]);

  // Check if all are selected
  const allSelected = filteredInsights.length > 0 && selectedKeys.size === filteredInsights.length;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Fixed Header - matching Settings style */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center"
          style={{
            height: '72px',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
            paddingLeft: '16px',
            paddingRight: '16px',
            backgroundColor: 'var(--bg)',
          }}
        >
          <div className="w-full flex items-center justify-between">
            {/* Left: Back button + Title */}
            <div className="flex items-center gap-0">
              <button
                onClick={navigateBack}
                className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                aria-label={t('back') || 'Go back'}
                style={{ color: 'var(--text-primary)' }}
              >
                <ChevronLeft size={28} strokeWidth={2.5} />
              </button>
              <span
                className="font-semibold"
                style={{
                  fontFamily: 'var(--font-family)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '20px',
                }}
              >
                {t('insights')}
              </span>
            </div>
            {/* Right: Profile Avatar */}
            <div className="flex items-center justify-end min-w-[48px] relative">
              <ProfileAvatar
                ref={profileButtonRef}
                initials={initials}
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
        </header>
        {/* Content with top padding for fixed header */}
        <div className="flex-1 pt-[72px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header - matching Settings style */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={{
          height: '72px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div className="w-full flex items-center justify-between">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-0">
            <button
              onClick={navigateBack}
              className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
              aria-label={t('back') || 'Go back'}
              style={{ color: 'var(--text-primary)' }}
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <span
              className="font-semibold"
              style={{
                fontFamily: 'var(--font-family)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              {t('insights')}
            </span>
          </div>
          {/* Right: Profile Avatar */}
          <div className="flex items-center justify-end min-w-[48px] relative">
            <ProfileAvatar
              ref={profileButtonRef}
              initials={initials}
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
      </header>

      {/* Content area with top padding for fixed header and bottom padding for nav */}
      <div className="flex-1 pt-[72px] pb-24 px-3 overflow-y-auto">
        {/* Story 14.33b AC1: View Switcher - pill-style buttons */}
        <div className="mb-4">
          <InsightsViewSwitcher
            activeView={activeView}
            onViewChange={handleViewChange}
            t={t}
          />
        </div>

      {/* Selection Mode Toolbar */}
      {/* Story 11.6: Position above nav bar accounting for safe area (AC #3) */}
      {selectionMode && (
        <div
          className="fixed left-4 right-4 z-40 p-3 rounded-xl shadow-lg flex items-center justify-between"
          style={{
            backgroundColor: theme === 'dark' ? '#1e293b' : 'white',
            borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            bottom: 'calc(5rem + var(--safe-bottom, 0px))',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelSelection}
              className="p-2 rounded-full transition-colors min-w-10 min-h-10 flex items-center justify-center"
              style={{ color: 'var(--primary)' }}
              aria-label={t('close') || 'Close'}
            >
              <X size={20} />
            </button>
            <span style={{ color: 'var(--primary)' }}>
              {selectedKeys.size} {t('selected') || 'selected'}
            </span>
          </div>
          {/* Story 14.16b: Using --error CSS variable for destructive action */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedKeys.size === 0 || isDeleting}
            className="py-2 px-3 rounded-lg font-medium flex items-center gap-1.5 min-h-10 transition-colors text-sm"
            style={{
              backgroundColor: selectedKeys.size > 0
                ? (theme === 'dark' ? 'var(--negative-bg)' : 'var(--negative-bg)')
                : (theme === 'dark' ? '#374151' : '#f3f4f6'),
              color: selectedKeys.size > 0 ? 'var(--error)' : (theme === 'dark' ? '#6b7280' : '#9ca3af'),
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Trash2 size={16} />
            {isDeleting ? (t('deleting') || 'Deleting...') : (t('delete') || 'Delete')}
          </button>
        </div>
      )}

      {/* Story 14.33b: Conditional view rendering based on activeView */}

      {/* VIEW: LIST (Default) - Now includes highlighted section at top */}
      {activeView === 'list' && (
        <>
          {/* AC5: Empty state */}
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lightbulb
                size={48}
                className="mb-4 opacity-50"
                style={{ color: 'var(--secondary)' }}
              />
              <p
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--primary)' }}
              >
                {t('noInsightsYet')}
              </p>
              <p className="text-sm" style={{ color: 'var(--secondary)' }}>
                {t('scanMoreReceipts')}
              </p>
            </div>
          ) : filteredInsights.length === 0 ? (
            /* No results for current filter */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lightbulb
                size={48}
                className="mb-4 opacity-50"
                style={{ color: 'var(--secondary)' }}
              />
              <p
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--primary)' }}
              >
                {t('noInsightsForPeriod') || 'No insights for this period'}
              </p>
              <p className="text-sm" style={{ color: 'var(--secondary)' }}>
                {t('tryDifferentFilter') || 'Try selecting a different time period'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Highlighted insights section (merged from Destacados) */}
              {selectHighlightedInsights(insights).length > 0 && !selectionMode && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className="text-sm font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--secondary)' }}
                    >
                      {t('highlighted') || 'Destacados'}
                    </h2>
                    <InsightsTemporalFilter
                      insights={insights}
                      filter={temporalFilter}
                      onFilterChange={setTemporalFilter}
                      theme={theme}
                      t={t}
                    />
                  </div>
                  <InsightsCarousel
                    insights={insights}
                    theme={theme}
                    t={t}
                  />
                </div>
              )}

              {/* AC1 & AC2: Grouped insights list */}
              {groupedInsights.map((group, groupIdx) => (
                <div key={group.labelKey}>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className="text-sm font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--secondary)' }}
                    >
                      {group.label}
                    </h2>
                    {/* Show Select All only on first group when in selection mode */}
                    {selectionMode && groupIdx === 0 && (
                      <button
                        onClick={allSelected ? handleCancelSelection : handleSelectAll}
                        className="text-sm font-medium"
                        style={{ color: 'var(--primary)' }}
                      >
                        {allSelected ? (t('deselectAll') || 'Deselect All') : (t('selectAll') || 'Select All')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {group.insights.map((insight, idx) => (
                      <InsightHistoryCard
                        key={`${insight.insightId}-${idx}`}
                        insight={insight}
                        onClick={() => handleInsightClick(insight)}
                        onLongPressStart={() => handleLongPressStart(insight)}
                        onLongPressEnd={handleLongPressEnd}
                        isSelected={selectedKeys.has(getInsightKey(insight))}
                        selectionMode={selectionMode}
                        theme={theme}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW: AIRLOCK - PLACEHOLDER: AI Insights feature for future release */}
      {activeView === 'airlock' && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <span style={{ fontSize: '40px' }}>🔮</span>
          </div>
          <p
            className="text-lg font-semibold mb-2"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            Insights con IA
          </p>
          <p
            className="text-sm mb-4 max-w-xs"
            style={{
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            Estamos desarrollando análisis inteligente de tus gastos con inteligencia artificial para darte recomendaciones personalizadas.
          </p>
          <p
            className="text-xs"
            style={{
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            Próximamente disponible
          </p>
        </div>
      )}

      {/* VIEW: CELEBRATION (Achievement) - Story 14.33d: Celebration & Personal Records Display */}
      {activeView === 'celebration' && (
        <CelebrationView
          onBack={navigateBack}
          theme={theme}
          t={t}
          db={services?.db ?? null}
          userId={user?.uid ?? null}
          appId={services?.appId ?? null}
        />
      )}

        {/* Detail Modal */}
        {selectedInsight && (
          <InsightDetailModal
            insight={selectedInsight}
            onClose={handleCloseModal}
            onNavigateToTransaction={handleNavigateToTransaction}
            onDelete={handleDeleteInsight}
            theme={theme}
            t={t}
          />
        )}
      </div>
    </div>
  );
};
