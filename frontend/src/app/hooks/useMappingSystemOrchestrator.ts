/**
 * useMappingSystemOrchestrator - Composes category, merchant, subcategory,
 * item name mapping hooks and insight profile.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useCategoryMappings } from '../../hooks/useCategoryMappings';
import { useMerchantMappings } from '../../hooks/useMerchantMappings';
import { useSubcategoryMappings } from '../../hooks/useSubcategoryMappings';
import { useItemNameMappings } from '../../hooks/useItemNameMappings';
import { useInsightProfile } from '@features/insights/hooks/useInsightProfile';
import type { User } from 'firebase/auth';
import type { Services } from '../../contexts/AuthContext';

export function useMappingSystemOrchestrator(
    user: User | null,
    services: Services | null,
) {
    // Category, merchant, subcategory, and item name mappings for learning system
    const { mappings } = useCategoryMappings(user, services);
    const { findMatch: findMerchantMatch } = useMerchantMappings(user, services);
    useSubcategoryMappings(user, services);
    const { findMatch: findItemNameMatch } = useItemNameMappings(user, services);

    // Insight profile for generating contextual insights after transactions
    const {
        profile: insightProfile,
        cache: insightCache,
        recordShown: recordInsightShown,
        trackTransaction: trackTransactionForInsight,
        incrementCounter: incrementInsightCounter,
    } = useInsightProfile(user, services);

    return {
        mappings,
        findMerchantMatch,
        findItemNameMatch,
        insightProfile,
        insightCache,
        recordInsightShown,
        trackTransactionForInsight,
        incrementInsightCounter,
    };
}
