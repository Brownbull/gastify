/**
 * useAppDataHooks - Single hook composing all 5 domain orchestrators.
 * Centralizes all data hook initialization for App.tsx.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useUserContextOrchestrator } from './useUserContextOrchestrator';
import { useTransactionDataOrchestrator } from './useTransactionDataOrchestrator';
import { useScanWorkflowOrchestrator } from './useScanWorkflowOrchestrator';
import { useMappingSystemOrchestrator } from './useMappingSystemOrchestrator';
import { useViewHandlersOrchestrator } from './useViewHandlersOrchestrator';

export function useAppDataHooks() {
    // Phase 1: User context (no dependencies)
    const userContext = useUserContextOrchestrator();

    // Phase 2: Data orchestrators (depend on user/services)
    const txData = useTransactionDataOrchestrator(userContext.user, userContext.services);
    const mappingSystem = useMappingSystemOrchestrator(userContext.user, userContext.services);
    const scans = useScanWorkflowOrchestrator(userContext.user, userContext.services);

    // Phase 3: View handlers (depends on preferences)
    const viewHandlers = useViewHandlersOrchestrator(userContext.userPreferences);

    return {
        userContext,
        txData,
        mappingSystem,
        scans,
        viewHandlers,
    };
}
