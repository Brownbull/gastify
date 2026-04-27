/**
 * Story 14c-refactor.9: AuthContext - App-wide authentication context
 * Task C1: Clear IndexedDB Cache on Logout (CRITICAL Security Fix)
 *
 * Provides authentication state and methods to the entire app via React Context.
 * Wraps the existing useAuth hook logic to enable context-based access.
 *
 * Features:
 * - Firebase authentication (Google Sign-In, test credentials)
 * - User state management
 * - Firebase services initialization (Auth, Firestore)
 * - Sign out with notification cleanup
 * - CRITICAL: IndexedDB cache clearing on logout (OWASP A3 - Sensitive Data Exposure)
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * // In any component
 * const { user, services, signIn, signOut } = useAuthContext();
 *
 * // Check authentication
 * if (!user) return <LoginScreen onSignIn={signIn} />;
 *
 * // Access Firestore
 * const db = services?.db;
 * ```
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import {
    Auth,
    User,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { Firestore, clearIndexedDbPersistence, terminate, doc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../config/firebase';
import {
    disableWebPushNotifications,
    WEB_PUSH_CONSTANTS,
} from '../services/webPushService';
import { getStorageString } from '@/utils/storage';
import { classifyError, getErrorInfo } from '@/utils/errorHandler';

// =============================================================================
// Types
// =============================================================================

/**
 * Firebase services container
 */
export interface Services {
    auth: Auth;
    db: Firestore;
    appId: string;
}

/**
 * Context value provided to consumers
 */
export interface AuthContextValue {
    /** Current authenticated Firebase user (null if not signed in) */
    user: User | null;
    /** Firebase services (null during initialization) */
    services: Services | null;
    /** Initialization error message (null if no error) */
    initError: string | null;
    /** Sign in with Google OAuth popup */
    signIn: () => Promise<void>;
    /** Sign in with email/password (dev/test environments only) */
    signInWithTestCredentials: (email?: string, password?: string) => Promise<void>;
    /** Sign out and clean up notifications */
    signOut: () => Promise<void>;
}

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Auth Context - provides authentication state and actions.
 *
 * IMPORTANT: Do not use useContext(AuthContext) directly.
 * Use the useAuthContext() hook instead for proper error handling.
 */
const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

interface AuthProviderProps {
    children: ReactNode;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Auth Context Provider.
 *
 * Wrap your app with this provider to enable authentication.
 * Should be placed high in the component tree, before ScanProvider.
 *
 * @example
 * ```tsx
 * <QueryClientProvider>
 *   <AuthProvider>
 *     <ViewModeProvider>
 *       <ScanProvider>
 *         <App />
 *       </ScanProvider>
 *     </ViewModeProvider>
 *   </AuthProvider>
 * </QueryClientProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [services, setServices] = useState<Services | null>(null);
    const [initError, setInitError] = useState<string | null>(null);

    // Set up auth listener using shared Firebase services from config/firebase.ts
    // Emulator connections are handled automatically in firebase.ts on module load
    useEffect(() => {
        try {
            if (!firebaseConfig || !firebaseConfig.projectId) {
                throw new Error('Firebase Config Missing');
            }

            const appId = firebaseConfig.projectId;
            setServices({ auth, db, appId });

            // Story 16-9: Staging whitelist check — block non-whitelisted users
            const isStaging = appId === 'boletapp-staging';

            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser && isStaging) {
                    if (!firebaseUser.email) {
                        setInitError('Email-based authentication required for staging.');
                        await firebaseSignOut(auth);
                        return;
                    }
                    try {
                        const emailRef = doc(db, 'allowedEmails', firebaseUser.email);
                        const snap = await getDoc(emailRef);
                        if (!snap.exists()) {
                            setInitError('Access not authorized. Your email is not in the staging whitelist.');
                            await firebaseSignOut(auth);
                            return;
                        }
                    } catch {
                        setInitError('Unable to verify staging access. Please try again.');
                        await firebaseSignOut(auth);
                        return;
                    }
                }
                setUser(firebaseUser);
            });
            return unsubscribe;
        } catch (e: unknown) {
            const info = getErrorInfo(classifyError(e));
            setInitError(info.messageKey);
        }
    }, []);

    // ===========================================================================
    // Action Functions
    // ===========================================================================

    /**
     * Sign in with Google OAuth popup.
     * Shows account picker even if already signed into Google.
     */
    const signIn = useCallback(async () => {
        if (!services) return;
        try {
            const provider = new GoogleAuthProvider();
            // Always show account picker, even if user is already signed into Google
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(services.auth, provider);
        } catch (e: unknown) {
            const info = getErrorInfo(classifyError(e));
            alert(info.titleKey);
        }
    }, [services]);

    /**
     * Sign in with email/password credentials.
     * Only available in development/test environments.
     *
     * @param email - User email (defaults to env var or fallback)
     * @param password - User password (defaults to env var or fallback)
     */
    const signInWithTestCredentials = useCallback(
        async (
            email: string = import.meta.env.VITE_TEST_USER_EMAIL || 'test@example.com',
            password: string = import.meta.env.VITE_TEST_USER_PASSWORD || 'testpassword'
        ) => {
            if (!services) {
                if (import.meta.env.DEV) {
                    console.error('[AuthContext] No services available for test login');
                }
                return;
            }

            // Allow in dev environments OR when VITE_ENABLE_TEST_LOGIN is set
            const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
            const testLoginEnabled = import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true';

            if (!isDev && !testLoginEnabled) {
                throw new Error('Test authentication is only available in development/test environments');
            }

            try {
                await signInWithEmailAndPassword(services.auth, email, password);
            } catch (e: unknown) {
                if (import.meta.env.DEV) {
                    const error = e as Error & { code?: string };
                    console.error('[AuthContext] Test login failed:', error.code, error.message);
                }
                const info = getErrorInfo(classifyError(e));
                alert(info.titleKey);
            }
        },
        [services]
    );

    /**
     * Sign out and clean up web push notifications.
     * This is CRITICAL for proper notification routing when users share devices.
     */
    const handleSignOut = useCallback(async () => {
        if (!services) return;

        // CRITICAL: Clear IndexedDB to prevent user data leakage on shared devices
        // (OWASP A3 - Sensitive Data Exposure)
        try {
            // Must terminate first, then clear persistence
            await terminate(services.db);
            await clearIndexedDbPersistence(services.db);
        } catch {
            // Don't block sign-out if cache clearing fails
            // This can happen if persistence wasn't enabled or already terminated
            if (import.meta.env.DEV) {
                console.warn('[AuthContext] Could not clear IndexedDB persistence');
            }
        }

        // Clean up web push notifications (existing code)
        // This is CRITICAL for proper notification routing when users share devices
        // If we don't delete the subscription, notifications will be sent to the wrong user
        try {
            // Check if user had notifications enabled
            const wasEnabled = getStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_KEY, 'false') === 'true';

            if (wasEnabled) {
                // Disable web push notifications (unsubscribes and deletes from server)
                await disableWebPushNotifications();
            }
        } catch {
            // Don't block sign-out if subscription deletion fails
            // Silently continue - user can still sign out
        }

        await firebaseSignOut(services.auth);
    }, [services]);

    // ===========================================================================
    // Memoized Context Value
    // ===========================================================================

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            services,
            initError,
            signIn,
            signInWithTestCredentials,
            signOut: handleSignOut,
        }),
        [user, services, initError, signIn, signInWithTestCredentials, handleSignOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Consumer Hooks
// =============================================================================

/**
 * Access auth context - throws if outside provider.
 *
 * Use this hook in components that REQUIRE authentication functionality.
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { user, services, signOut } = useAuthContext();
 *
 *   if (!user) return <LoginScreen />;
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.displayName}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuthContext(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

/**
 * Access auth context - returns null if outside provider.
 *
 * Use this hook in components that OPTIONALLY use authentication,
 * such as layout components rendered before full app initialization.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const auth = useAuthContextOptional();
 *
 *   // Only show user info if context is available
 *   if (auth?.user) {
 *     return <UserHeader user={auth.user} />;
 *   }
 *
 *   return <DefaultHeader />;
 * }
 * ```
 */
export function useAuthContextOptional(): AuthContextValue | null {
    return useContext(AuthContext);
}

// =============================================================================
// Re-exports for backwards compatibility with useAuth hook
// =============================================================================

export type { User } from 'firebase/auth';
