/**
 * Story 14c-refactor.22: View Renderer Functions
 * Story 14c-refactor.22b: TypeScript Safety - Replace 63 `any` types
 * Story 14c-refactor.22c: renderViewSwitch + 7 missing render functions
 * Story 14e-25d: ViewHandlersContext Deleted - views use direct hooks
 *
 * Helper functions that render individual views with their view-scoped providers.
 * Moved from App.tsx to reduce its line count.
 *
 * Props use ComponentProps to extract exact types from view components,
 * ensuring type safety at both the render function boundary and the JSX level.
 *
 * ## Navigation and Handler Access (Story 14e-25d)
 *
 * Views now use direct hooks for navigation and handlers:
 * - Navigation: useNavigationActions() from @/shared/stores
 * - Toast: useToast() from @/shared/hooks
 * - Modals: useModalActions() from @/managers/ModalManager
 * - History navigation: useHistoryNavigation() from @/shared/hooks
 *
 * ### Props That Should Remain
 *
 * Some props involve view-specific logic or state that's better passed explicitly:
 * - Data props (transactions, theme, currency, etc.)
 * - Mapping save callbacks (onSaveMapping, etc.) - learning system specific
 * - Batch navigation (onBatchPrevious, onBatchNext) - batch flow specific
 * - Scan flow callbacks (onPhotoSelect, onProcessScan) - scan feature specific
 */

import type { ComponentProps, ReactNode } from 'react';

// Views
import { DashboardView } from '../../views/DashboardView';
import { TrendsView } from '../../views/TrendsView';
import { InsightsView } from '../../views/InsightsView';
import { HistoryView } from '../../views/HistoryView';
import { RecentScansView } from '@features/scan/views/RecentScansView';
import { ItemsView } from '../../views/ItemsView';
import { ReportsView } from '../../views/ReportsView';
import { StatementScanView } from '@features/scan/views/StatementScanView';
// Story 14c-refactor.22c: Additional views for renderViewSwitch
import { NotificationsView } from '../../views/NotificationsView';
import { SettingsView } from '../../views/SettingsView';
import { TransactionEditorView } from '../../views/TransactionEditorView';
import { BatchCaptureView } from '../../views/BatchCaptureView';
import { BatchReviewView } from '../../views/BatchReviewView';

// Story 15b-3g: HistoryFiltersProvider replaced by useHistoryFiltersInit hook
import { useHistoryFiltersInit } from '@/shared/hooks/useHistoryFiltersInit';
import type { HistoryFilterState } from '@/types/historyFilters';


// View type for switch
import type { View } from './types';

// =============================================================================
// Type Definitions
// =============================================================================

// Extract exact prop types from view components using ComponentProps
// This ensures render functions accept exactly what views expect
type DashboardViewProps = ComponentProps<typeof DashboardView>;
type TrendsViewProps = ComponentProps<typeof TrendsView>;
type InsightsViewProps = ComponentProps<typeof InsightsView>;
type HistoryViewProps = ComponentProps<typeof HistoryView>;
type ItemsViewProps = ComponentProps<typeof ItemsView>;
type RecentScansViewProps = ComponentProps<typeof RecentScansView>;
type ReportsViewProps = ComponentProps<typeof ReportsView>;
type StatementScanViewProps = ComponentProps<typeof StatementScanView>;
// Story 14c-refactor.22c: Additional view prop types
type NotificationsViewProps = ComponentProps<typeof NotificationsView>;
type SettingsViewProps = ComponentProps<typeof SettingsView>;
type TransactionEditorViewProps = ComponentProps<typeof TransactionEditorView>;
type BatchCaptureViewProps = ComponentProps<typeof BatchCaptureView>;
type BatchReviewViewProps = ComponentProps<typeof BatchReviewView>;

// =============================================================================
// Dashboard View
// =============================================================================

/** Props for renderDashboardView - extends DashboardViewProps with no additions */
export type RenderDashboardViewProps = DashboardViewProps;

export function renderDashboardView(props: RenderDashboardViewProps) {
    return <DashboardViewWithFilters {...props} />;
}

function DashboardViewWithFilters(props: RenderDashboardViewProps) {
    useHistoryFiltersInit();
    return <DashboardView {...props} />;
}

// =============================================================================
// Trends View
// =============================================================================

/** Props for renderTrendsView - extends TrendsViewProps */
export type RenderTrendsViewProps = TrendsViewProps;

export function renderTrendsView(props: RenderTrendsViewProps) {
    return <TrendsViewWithFilters {...props} />;
}

function TrendsViewWithFilters(props: TrendsViewProps) {
    useHistoryFiltersInit();
    return <TrendsView {...props} />;
}

// =============================================================================
// Insights View
// =============================================================================

/**
 * Story 14e-25c.2: Minimal props for InsightsView.
 * Navigation callbacks migrated to useNavigationActions() hook.
 * Story 14e-25d: Transaction edit uses useToast(), useModalActions() directly.
 */
export type RenderInsightsViewProps = InsightsViewProps;

export function renderInsightsView(props: RenderInsightsViewProps) {
    return <InsightsView {...props} />;
}

// =============================================================================
// History View
// =============================================================================

/**
 * Story 14e-25a.2b: RenderHistoryViewProps updated for data-owning HistoryView.
 * HistoryView now gets its data via useHistoryViewData hook internally.
 */
export interface RenderHistoryViewProps extends HistoryViewProps {
    /** Initial filter state for useHistoryFiltersInit */
    initialState?: HistoryFilterState;
    /** Callback when filter state changes */
    onStateChange?: (state: HistoryFilterState) => void;
}

export function renderHistoryView(props: RenderHistoryViewProps) {
    return <HistoryViewWithFilters {...props} />;
}

function HistoryViewWithFilters(props: RenderHistoryViewProps) {
    const { initialState, onStateChange, _testOverrides } = props;
    useHistoryFiltersInit({ initialState, onStateChange });
    return <HistoryView _testOverrides={_testOverrides} />;
}

// =============================================================================
// Items View
// =============================================================================

/**
 * Story 14e-25c.2: Minimal props for ItemsView.
 * Transactions obtained via internal hooks.
 * User info obtained via useAuth().
 * Theme settings obtained via useTheme().
 */
export interface RenderItemsViewProps extends ItemsViewProps {
    /** Initial filter state for useHistoryFiltersInit */
    initialState?: HistoryFilterState;
    /** Callback when filter state changes */
    onStateChange?: (state: HistoryFilterState) => void;
}

export function renderItemsView(props: RenderItemsViewProps) {
    return <ItemsViewWithFilters {...props} />;
}

function ItemsViewWithFilters(props: RenderItemsViewProps) {
    const { initialState, onStateChange, ...itemsProps } = props;
    useHistoryFiltersInit({ initialState, onStateChange });
    return <ItemsView {...itemsProps} />;
}

// =============================================================================
// Recent Scans View
// =============================================================================

/** Props for renderRecentScansView - extends RecentScansViewProps with no additions */
export type RenderRecentScansViewProps = RecentScansViewProps;

export function renderRecentScansView(props: RenderRecentScansViewProps) {
    return <RecentScansView {...props} />;
}

// =============================================================================
// Reports View
// =============================================================================

/**
 * Story 14e-25c.2: Minimal props for ReportsView.
 * Navigation callbacks migrated to useNavigation() hook.
 * Transactions obtained via internal hooks.
 */
export type RenderReportsViewProps = ReportsViewProps;

export function renderReportsView(props: RenderReportsViewProps) {
    return <ReportsView {...props} />;
}

// =============================================================================
// Statement Scan View
// =============================================================================

/** Props for renderStatementScanView - extends StatementScanViewProps with no additions */
export type RenderStatementScanViewProps = StatementScanViewProps;

export function renderStatementScanView(props: RenderStatementScanViewProps) {
    return <StatementScanView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: Alerts View (NotificationsView)
// =============================================================================

/** Props for renderAlertsView - uses NotificationsView component */
export type RenderAlertsViewProps = NotificationsViewProps;

export function renderAlertsView(props: RenderAlertsViewProps) {
    return <NotificationsView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: Settings View
// =============================================================================

/** Props for renderSettingsView - extends SettingsViewProps with no additions */
export type RenderSettingsViewProps = SettingsViewProps;

export function renderSettingsView(props: RenderSettingsViewProps) {
    return <SettingsView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: Transaction Editor View
// =============================================================================

/** Props for renderTransactionEditorView - extends TransactionEditorViewProps with no additions */
export type RenderTransactionEditorViewProps = TransactionEditorViewProps;

export function renderTransactionEditorView(props: RenderTransactionEditorViewProps) {
    return <TransactionEditorView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: Batch Capture View
// =============================================================================

/**
 * Story 14e-25c.2: Minimal props for BatchCaptureView.
 * Navigation uses useNavigation() hook.
 * Batch state accessed via useScanStore().
 */
export type RenderBatchCaptureViewProps = BatchCaptureViewProps;

export function renderBatchCaptureView(props: RenderBatchCaptureViewProps) {
    return <BatchCaptureView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: Batch Review View
// =============================================================================

/** Props for renderBatchReviewView - extends BatchReviewViewProps with no additions */
export type RenderBatchReviewViewProps = BatchReviewViewProps;

export function renderBatchReviewView(props: RenderBatchReviewViewProps) {
    return <BatchReviewView {...props} />;
}

// =============================================================================
// Story 14c-refactor.22c: ViewRenderProps Interface
// =============================================================================

/**
 * Union type of all view render props for type-safe access.
 * This is a discriminated union based on the view type.
 *
 * Used by renderViewSwitch to provide proper typing.
 */
export type ViewRenderPropsMap = {
    dashboard: RenderDashboardViewProps;
    trends: RenderTrendsViewProps;
    insights: RenderInsightsViewProps;
    history: RenderHistoryViewProps;
    items: RenderItemsViewProps;
    'recent-scans': RenderRecentScansViewProps;
    reports: RenderReportsViewProps;
    'statement-scan': RenderStatementScanViewProps;
    alerts: RenderAlertsViewProps;
    settings: RenderSettingsViewProps;
    'transaction-editor': RenderTransactionEditorViewProps;
    'batch-capture': RenderBatchCaptureViewProps;
    'batch-review': RenderBatchReviewViewProps;
};

/**
 * ViewRenderProps is a union of all possible view props.
 * Each property is optional to support the unified renderViewSwitch function.
 *
 * Note: In practice, you pass the specific props for the view being rendered.
 * This type exists to document the full interface for App.tsx usage.
 */
export interface ViewRenderProps {
    // Dashboard
    dashboard?: RenderDashboardViewProps;
    // Trends
    trends?: RenderTrendsViewProps;
    // Insights
    insights?: RenderInsightsViewProps;
    // History
    history?: RenderHistoryViewProps;
    // Items
    items?: RenderItemsViewProps;
    // Recent Scans
    recentScans?: RenderRecentScansViewProps;
    // Reports
    reports?: RenderReportsViewProps;
    // Statement Scan
    statementScan?: RenderStatementScanViewProps;
    // Alerts (Notifications)
    alerts?: RenderAlertsViewProps;
    // Settings
    settings?: RenderSettingsViewProps;
    // Transaction Editor
    transactionEditor?: RenderTransactionEditorViewProps;
    // Batch Capture
    batchCapture?: RenderBatchCaptureViewProps;
    // Batch Review
    batchReview?: RenderBatchReviewViewProps;
}

// =============================================================================
// Story 14c-refactor.22c: renderViewSwitch Function
// =============================================================================

/**
 * Unified view switch function that renders the appropriate view based on the view type.
 *
 * This function centralizes all view rendering logic that was previously inline in App.tsx.
 * Each view case calls its respective render function with properly typed props.
 *
 * @param view - The current view to render
 * @param props - Props object containing the specific props for the view
 * @returns ReactNode - The rendered view component
 *
 * @example
 * ```tsx
 * // In App.tsx
 * {renderViewSwitch(view, {
 *   dashboard: dashboardProps,
 *   trends: trendsProps,
 *   // ... other view props
 * })}
 * ```
 */
export function renderViewSwitch(view: View, props: ViewRenderProps): ReactNode {
    switch (view) {
        case 'dashboard':
            return props.dashboard ? renderDashboardView(props.dashboard) : null;

        case 'trends':
            return props.trends ? renderTrendsView(props.trends) : null;

        case 'insights':
            return props.insights ? renderInsightsView(props.insights) : null;

        case 'history':
            return props.history ? renderHistoryView(props.history) : null;

        case 'items':
            return props.items ? renderItemsView(props.items) : null;

        case 'recent-scans':
            return props.recentScans ? renderRecentScansView(props.recentScans) : null;

        case 'reports':
            return props.reports ? renderReportsView(props.reports) : null;

        case 'statement-scan':
            return props.statementScan ? renderStatementScanView(props.statementScan) : null;

        case 'alerts':
            return props.alerts ? renderAlertsView(props.alerts) : null;

        case 'settings':
            return props.settings ? renderSettingsView(props.settings) : null;

        case 'transaction-editor':
            return props.transactionEditor ? renderTransactionEditorView(props.transactionEditor) : null;

        case 'batch-capture':
            return props.batchCapture ? renderBatchCaptureView(props.batchCapture) : null;

        case 'batch-review':
            return props.batchReview ? renderBatchReviewView(props.batchReview) : null;

        // Deprecated views (commented out in App.tsx)
        case 'scan':
        case 'scan-result':
        case 'edit':
            // These views are deprecated - return null
            return null;

        default:
            // TypeScript exhaustiveness check
            const _exhaustive: never = view;
            return _exhaustive;
    }
}
