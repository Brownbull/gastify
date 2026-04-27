/**
 * CategoriesFeature Orchestrator Component
 *
 * Story 14e-17: Categories Feature Extraction
 *
 * A headless feature component that provides category and subcategory
 * mapping state to the component tree via React Context.
 *
 * Unlike ScanFeature or BatchReviewFeature which render their own UI,
 * CategoriesFeature is a provider that makes category state available
 * to child components (TransactionEditorView, SettingsView, etc.).
 *
 * ## Usage
 *
 * ```tsx
 * // In App.tsx
 * <CategoriesFeature user={user} services={services}>
 *   <AppContent />
 * </CategoriesFeature>
 *
 * // In views/hooks
 * const { categoryMappings, saveCategoryMapping } = useCategoriesContext();
 * ```
 *
 * ## Migration Path
 *
 * This replaces direct calls to useCategoryMappings and useSubcategoryMappings
 * in App.tsx, centralizing category state management in the feature module.
 *
 * @see src/features/categories/state/useCategoriesState.ts - Underlying state hook
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { Services } from '@/hooks/useAuth';
import { useCategoriesState, UseCategoriesStateReturn } from './state';

// =============================================================================
// Context
// =============================================================================

/**
 * Context for categories feature state.
 * null when not inside a CategoriesFeature provider.
 */
const CategoriesContext = createContext<UseCategoriesStateReturn | null>(null);

// =============================================================================
// Hook
// =============================================================================

/**
 * Access categories state from the nearest CategoriesFeature provider.
 *
 * @throws Error if used outside of CategoriesFeature
 * @returns Categories state and operations
 *
 * @example
 * ```tsx
 * const { categoryMappings, saveCategoryMapping } = useCategoriesContext();
 * ```
 */
export function useCategoriesContext(): UseCategoriesStateReturn {
    const context = useContext(CategoriesContext);

    if (context === null) {
        throw new Error(
            'useCategoriesContext must be used within a CategoriesFeature provider. ' +
            'Wrap your component tree with <CategoriesFeature>.'
        );
    }

    return context;
}

/**
 * Optional hook that returns categories state or undefined if not in provider.
 * Use this when the component may render outside of CategoriesFeature.
 *
 * @returns Categories state or undefined
 */
export function useCategoriesContextOptional(): UseCategoriesStateReturn | undefined {
    const context = useContext(CategoriesContext);
    return context ?? undefined;
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for CategoriesFeature component.
 */
export interface CategoriesFeatureProps {
    /**
     * Current authenticated user.
     * Pass null if user is not authenticated.
     */
    user: User | null;

    /**
     * Firebase services object.
     * Pass null if services are not initialized.
     */
    services: Services | null;

    /**
     * Optional child components to render.
     * When provided, these children will have access to useCategoriesContext().
     * When omitted, the feature operates as a headless provider for the
     * FeatureOrchestrator pattern (Story 14e-21).
     */
    children?: ReactNode;
}

// =============================================================================
// Component
// =============================================================================

/**
 * CategoriesFeature - Headless context provider for category state.
 *
 * This component:
 * 1. Calls useCategoriesState with user and services
 * 2. Provides the state via CategoriesContext
 * 3. Renders children directly (no additional UI)
 *
 * @example
 * ```tsx
 * <CategoriesFeature user={user} services={services}>
 *   <TransactionEditorView />
 *   <SettingsView />
 * </CategoriesFeature>
 * ```
 */
export function CategoriesFeature({
    user,
    services,
    children,
}: CategoriesFeatureProps): React.ReactElement {
    // Get unified categories state
    const categoriesState = useCategoriesState(user, services);

    // Provide state to children via context
    return (
        <CategoriesContext.Provider value={categoriesState}>
            {children}
        </CategoriesContext.Provider>
    );
}

// Export context for testing purposes
export { CategoriesContext };
