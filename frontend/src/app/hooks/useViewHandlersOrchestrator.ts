/**
 * useViewHandlersOrchestrator - Composes navigation store, settings store,
 * transaction editor store, insight store, toast, modal actions, and UI state.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useState, useRef, useCallback, type RefObject } from 'react';
import {
    useSettingsStore,
    useLang,
    useCurrency,
    useDateFormat,
    useCurrentView,
    useSettingsSubview,
    usePendingHistoryFilters,
    usePendingDistributionView,
    useAnalyticsInitialState,
    useNavigationActions,
    useCurrentInsight,
    useShowInsightCard,
    useShowSessionComplete,
    useSessionContext,
    useShowBatchSummary,
    useInsightActions,
} from '@/shared/stores';
import {
    useCurrentTransaction,
    useNavigationList,
    useIsReadOnly,
    useCreditUsedInSession,
    useIsSaving,
    useAnimateItems,
    useEditorMode,
    useTransactionEditorActions,
} from '@features/transaction-editor';
import { useToast, type ToastMessage } from '@/shared/hooks';
import { useModalActions } from '../../managers/ModalManager';
import { DEFAULT_CURRENCY } from '../../utils/currency';
import { getSafeDate } from '../../utils/validation';
import { TRANSLATIONS } from '../../utils/translations';
import type { SessionContext as SessionContextType } from '../../components/session';
import type { Insight } from '../../types/insight';
import type { Transaction } from '../../types/transaction';
import type { TrustPromptEligibility } from '../../types/trust';
import type { UserPreferences } from '../../types/preferences';

export function useViewHandlersOrchestrator(
    userPreferences: UserPreferences,
) {
    // Navigation state from Zustand store
    const view = useCurrentView();
    const settingsSubview = useSettingsSubview();
    const pendingHistoryFilters = usePendingHistoryFilters();
    const pendingDistributionView = usePendingDistributionView();
    const analyticsInitialState = useAnalyticsInitialState();
    const {
        setView,
        setSettingsSubview,
        saveScrollPosition,
        setPendingHistoryFilters,
        setPendingDistributionView,
        setAnalyticsInitialState,
        clearAnalyticsInitialState,
    } = useNavigationActions();

    // Transaction editor state from Zustand store
    const currentTransaction = useCurrentTransaction();
    const transactionNavigationList = useNavigationList();
    const isViewingReadOnly = useIsReadOnly();
    const creditUsedInSession = useCreditUsedInSession();
    const isTransactionSaving = useIsSaving();
    const animateEditViewItems = useAnimateItems();
    const transactionEditorMode = useEditorMode();
    const {
        setTransaction: setCurrentTransaction,
        setNavigationList: setTransactionNavigationList,
        setReadOnly: setIsViewingReadOnly,
        setCreditUsed: setCreditUsedInSession,
        setAnimateItems: setAnimateEditViewItems,
        setMode: setTransactionEditorMode,
    } = useTransactionEditorActions();

    // Insight and session UI state from Zustand store
    const currentInsight = useCurrentInsight();
    const showInsightCard = useShowInsightCard();
    const showSessionComplete = useShowSessionComplete();
    const sessionContext = useSessionContext();
    const showBatchSummary = useShowBatchSummary();
    const {
        showInsight: storeShowInsight,
        hideInsight,
        showSessionCompleteOverlay,
        hideSessionCompleteOverlay,
        showBatchSummaryOverlay,
        hideBatchSummaryOverlay,
    } = useInsightActions();

    // Wrapper functions to bridge old useState setters to store actions
    const setCurrentInsight = useCallback((insight: Insight | null) => {
        if (insight) {
            storeShowInsight(insight);
        }
    }, [storeShowInsight]);

    const setShowInsightCard = useCallback((show: boolean) => {
        if (!show) {
            hideInsight();
        }
    }, [hideInsight]);

    const setShowBatchSummary = useCallback((show: boolean) => {
        if (show) {
            showBatchSummaryOverlay();
        } else {
            hideBatchSummaryOverlay();
        }
    }, [showBatchSummaryOverlay, hideBatchSummaryOverlay]);

    const setSessionContext = useCallback((ctx: SessionContextType | null) => {
        if (ctx) {
            showSessionCompleteOverlay(ctx);
        } else {
            hideSessionCompleteOverlay();
        }
    }, [showSessionCompleteOverlay, hideSessionCompleteOverlay]);

    // Batch upload and processing state
    const [showBatchPreview, setShowBatchPreview] = useState(false);
    const [isQuickSaving, setIsQuickSaving] = useState(false);

    // Refs for CreditFeature actions (enables cross-component communication)
    const trustActionsRef = useRef<{
        showTrustPromptAction: (data: TrustPromptEligibility) => void;
        hideTrustPrompt: () => void;
    } | null>(null);
    const creditActionsRef = useRef<{
        triggerCreditCheck: () => void;
    } | null>(null);

    // Settings
    const lang = useLang();
    const currency = useCurrency();
    const dateFormat = useDateFormat();
    const theme = useSettingsStore((state) => state.theme);
    const colorTheme = useSettingsStore((state) => state.colorTheme);
    const fontSize = useSettingsStore((state) => state.fontSize);

    // Font family from Firestore preferences
    const fontFamily = userPreferences.fontFamily || 'outfit';

    // Default location settings (from Firestore preferences)
    const defaultCountry = userPreferences.defaultCountry || '';
    const defaultCity = userPreferences.defaultCity || '';

    // Toast
    const { toastMessage, showToast, dismissToast } = useToast();
    const setToastMessage = useCallback((msg: ToastMessage | null) => {
        if (msg) {
            showToast(msg.text, msg.type);
        } else {
            dismissToast();
        }
    }, [showToast, dismissToast]);

    // File input ref (owned by ScanFeature, received via callback)
    const [fileInputRef, setFileInputRef] = useState<RefObject<HTMLInputElement>>({ current: null });
    const handleFileInputReady = useCallback((ref: RefObject<HTMLInputElement>) => {
        setFileInputRef(ref);
    }, []);


    // Translation function
    const t = (k: string) => (TRANSLATIONS[lang] as any)[k] || k;

    // Modal actions
    const { openModal: openModalAction, closeModal: closeModalAction } = useModalActions();

    /**
     * Creates a default empty transaction with user preferences.
     */
    const createDefaultTransaction = useCallback((): Transaction => {
        const baseTransaction: Transaction = {
            merchant: '',
            date: getSafeDate(null),
            total: 0,
            category: 'Supermarket',
            items: [],
            country: defaultCountry,
            city: defaultCity,
            currency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
        };

        return baseTransaction;
    }, [defaultCountry, defaultCity, userPreferences.defaultCurrency]);

    return {
        // Navigation
        view,
        settingsSubview,
        pendingHistoryFilters,
        pendingDistributionView,
        analyticsInitialState,
        setView,
        setSettingsSubview,
        saveScrollPosition,
        setPendingHistoryFilters,
        setPendingDistributionView,
        setAnalyticsInitialState,
        clearAnalyticsInitialState,
        // Transaction editor
        currentTransaction,
        transactionNavigationList,
        isViewingReadOnly,
        creditUsedInSession,
        isTransactionSaving,
        animateEditViewItems,
        transactionEditorMode,
        setCurrentTransaction,
        setTransactionNavigationList,
        setIsViewingReadOnly,
        setCreditUsedInSession,
        setAnimateEditViewItems,
        setTransactionEditorMode,
        // Insight UI
        currentInsight,
        showInsightCard,
        showSessionComplete,
        sessionContext,
        showBatchSummary,
        storeShowInsight,
        hideInsight,
        showSessionCompleteOverlay,
        hideSessionCompleteOverlay,
        showBatchSummaryOverlay,
        hideBatchSummaryOverlay,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        setSessionContext,
        // Batch UI state
        showBatchPreview,
        setShowBatchPreview,
        isQuickSaving,
        setIsQuickSaving,
        // Refs
        trustActionsRef,
        creditActionsRef,
        // Settings
        lang,
        currency,
        dateFormat,
        theme,
        colorTheme,
        fontSize,
        fontFamily,
        defaultCountry,
        defaultCity,
        // Toast
        toastMessage,
        showToast,
        dismissToast,
        setToastMessage,
        // File input
        fileInputRef,
        setFileInputRef,
        handleFileInputReady,
        // Translation
        t,
        // Modal
        openModalAction,
        closeModalAction,
        // Factory
        createDefaultTransaction,
    };
}
