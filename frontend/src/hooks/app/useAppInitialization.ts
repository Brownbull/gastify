/**
 * Story 14c-refactor.10: useAppInitialization Hook
 *
 * Coordinates app-level initialization by combining authentication state
 * from AuthContext with initialization status tracking. This hook provides
 * a unified interface for checking if the app is ready for user interaction.
 *
 * Features:
 * - Wraps AuthContext for auth state and services
 * - Tracks initialization completion status
 * - Provides combined ready state for dependent components
 * - Ensures ScanContext can safely access user ID
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 * Dependency: AuthContext must be initialized before this hook
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isInitialized, initError, services, user } = useAppInitialization();
 *
 *   if (initError) return <ErrorScreen error={initError} />;
 *   if (!isInitialized) return <LoadingScreen />;
 *   if (!user) return <LoginScreen />;
 *
 *   return <MainApp services={services} user={user} />;
 * }
 * ```
 */

import { useMemo } from 'react';
import { useAuthContext, type Services } from '../../contexts/AuthContext';
import type { User } from 'firebase/auth';

// =============================================================================
// Types
// =============================================================================

/**
 * Result returned by useAppInitialization hook
 */
export interface UseAppInitializationResult {
    /** Whether Firebase services are initialized */
    isInitialized: boolean;
    /** Initialization error message (null if no error) */
    initError: string | null;
    /** Firebase services (null during initialization) */
    services: Services | null;
    /** Current authenticated user (null if not signed in) */
    user: User | null;
    /** Whether user is authenticated and services are ready */
    isReady: boolean;
    /** Sign in handler from auth context */
    signIn: () => Promise<void>;
    /** Test sign in handler from auth context */
    signInWithTestCredentials: (email?: string, password?: string) => Promise<void>;
    /** Sign out handler from auth context */
    signOut: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to coordinate app initialization state.
 *
 * Provides a unified view of app initialization by combining
 * AuthContext state with derived flags for component convenience.
 *
 * This hook ensures proper initialization order:
 * 1. Firebase services initialize (services !== null)
 * 2. Auth state resolves (user is set or null)
 * 3. App is ready for user interaction
 *
 * @returns Initialization state and auth actions
 */
export function useAppInitialization(): UseAppInitializationResult {
    const auth = useAuthContext();

    // Derive initialization states
    const isInitialized = useMemo(() => {
        // Services being set indicates Firebase is initialized
        return auth.services !== null || auth.initError !== null;
    }, [auth.services, auth.initError]);

    const isReady = useMemo(() => {
        // App is ready when services are initialized AND user is authenticated
        return auth.services !== null && auth.user !== null;
    }, [auth.services, auth.user]);

    // Return combined state
    return useMemo<UseAppInitializationResult>(
        () => ({
            isInitialized,
            initError: auth.initError,
            services: auth.services,
            user: auth.user,
            isReady,
            signIn: auth.signIn,
            signInWithTestCredentials: auth.signInWithTestCredentials,
            signOut: auth.signOut,
        }),
        [
            isInitialized,
            auth.initError,
            auth.services,
            auth.user,
            isReady,
            auth.signIn,
            auth.signInWithTestCredentials,
            auth.signOut,
        ]
    );
}

export default useAppInitialization;
