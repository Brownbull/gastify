/**
 * Story 14c-refactor.9: useAuth hook - backwards compatible wrapper
 *
 * This hook now delegates to AuthContext for authentication functionality.
 * Maintained for backwards compatibility with existing code that imports useAuth.
 *
 * For new code, prefer importing useAuthContext directly from contexts/AuthContext.
 *
 * @example
 * ```tsx
 * // Legacy usage (still works)
 * import { useAuth } from './hooks/useAuth';
 * const { user, services, signIn, signOut } = useAuth();
 *
 * // Preferred new usage
 * import { useAuthContext } from './contexts/AuthContext';
 * const { user, services, signIn, signOut } = useAuthContext();
 * ```
 */

import { useAuthContext, type AuthContextValue, type Services } from '../contexts/AuthContext';

// Re-export types for backwards compatibility
export type { Services };

/**
 * Return type for useAuth hook
 * @deprecated Use AuthContextValue from contexts/AuthContext instead
 */
export type UseAuthReturn = AuthContextValue;

/**
 * Authentication hook - provides Firebase auth state and methods.
 *
 * This is a backwards-compatible wrapper around useAuthContext().
 * For new code, prefer using useAuthContext() directly.
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function App() {
 *   const { user, services, signIn, signOut } = useAuth();
 *
 *   if (!user) return <LoginScreen onSignIn={signIn} />;
 *
 *   return <Dashboard user={user} db={services?.db} />;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
    return useAuthContext();
}
