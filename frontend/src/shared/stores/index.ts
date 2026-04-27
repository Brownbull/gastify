// Shared stores used across multiple features

export {
  useSettingsStore,
  defaultSettingsState,
  useThemeMode,
  useColorTheme,
  useFontColorMode,
  useFontSize,
  useFontFamily,
  // Story 15-7c: Combined selector replacing ThemeContext's useTheme()
  useThemeSettings,
  // Story 14e-35: Locale selectors
  useLang,
  useCurrency,
  useDateFormat,
  useLocaleSettings,
  getSettingsState,
  settingsActions,
} from './useSettingsStore';

// Story 14e-25a.1: Navigation store
export {
  useNavigationStore,
  useNavigation,
  useCurrentView,
  usePreviousView,
  useSettingsSubview,
  usePendingHistoryFilters,
  usePendingDistributionView,
  useAnalyticsInitialState,
  useNavigationActions,
  getNavigationState,
  navigationActions,
  type NavigationState,
  type NavigationActions,
  type SettingsSubview,
  type NavigateToViewOptions,
} from './useNavigationStore';

// Story 15-7a: History filters store (replaces HistoryFiltersContext)
export {
    useHistoryFiltersStore,
    useHistoryFiltersState,
    useHistoryFiltersDispatch,
    getDefaultFilterState,
    historyFiltersActions,
} from './useHistoryFiltersStore';

// Story 16-6: Shared scan workflow store (data transport for scan/batch-review/transaction-editor)
export {
  useScanWorkflowStore,
  useWorkflowImages,
  useWorkflowBatchReceipts,
  useWorkflowBatchProgress,
  useWorkflowBatchEditingIndex,
  useWorkflowMode,
  useWorkflowPhase,
  useWorkflowIsProcessing,
  useWorkflowActiveDialog,
  useWorkflowImageCount,
  useWorkflowPendingTransaction,
  useWorkflowState,
  getWorkflowState,
  type ScanWorkflowState,
  type ScanWorkflowActions,
} from './useScanWorkflowStore';

// Story 14e-37: Insight store
export {
  useInsightStore,
  defaultInsightState,
  useCurrentInsight,
  useShowInsightCard,
  useShowSessionComplete,
  useSessionContext,
  useShowBatchSummary,
  useInsightCardState,
  useSessionCompleteState,
  useInsightActions,
  getInsightState,
  insightActions,
  type InsightState,
  type InsightActions,
} from './useInsightStore';

