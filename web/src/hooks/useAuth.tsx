import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { e2eAuthConfig } from "@/lib/e2eAuth";
import { setAuthToken } from "@/lib/api";
import {
  broadcastSignOut,
  clearClientSession,
  isSignOutBroadcast,
} from "@/lib/sessionIsolation";
import { translate } from "@/lib/i18n";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  /** E2E-only: present when the gated test-auth path is enabled (never in prod). */
  signInWithTestAuth: (() => Promise<void>) | null;
  /** E2E-only: second test user (B) for multi-user e2e; null when B not configured. */
  signInWithTestAuthB: (() => Promise<void>) | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
        } catch (err: unknown) {
          setAuthToken(null);
          const message =
            err instanceof Error ? err.message : "Failed to get auth token";
          setState({ user: null, loading: false, error: message });
          return;
        }
      } else {
        clearClientSession({ clearWebStorage: false });
      }
      setState({ user, loading: false, error: null });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (!isSignOutBroadcast(event)) return;

      void firebaseSignOut(auth).finally(() => {
        clearClientSession({ preserveBroadcastMarker: true });
        setState({ user: null, loading: false, error: null });
      });
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!state.user) return;

    const interval = setInterval(
      async () => {
        try {
          const token = await state.user!.getIdToken(true);
          setAuthToken(token);
        } catch {
          clearClientSession({ clearWebStorage: false });
          setState({
            user: null,
            loading: false,
            error: translate("auth.sessionExpired"),
          });
        }
      },
      10 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [state.user]);

  async function signInWithGoogle() {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setState((prev) => ({ ...prev, error: message }));
    }
  }

  async function signInWithTestUser(email: string, password: string) {
    if (!e2eAuthConfig.enabled || !email) return;
    setState((prev) => ({ ...prev, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Test sign-in failed";
      setState((prev) => ({ ...prev, error: message }));
    }
  }
  const signInWithTestAuth = () =>
    signInWithTestUser(e2eAuthConfig.email, e2eAuthConfig.password);
  const signInWithTestAuthB = () =>
    signInWithTestUser(e2eAuthConfig.emailB, e2eAuthConfig.passwordB);

  async function signOut() {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Firebase sign-out may fail (network, etc.) — proceed with local cleanup
    }
    clearClientSession();
    broadcastSignOut();
    setState({ user: null, loading: false, error: null });
  }

  return (
    <AuthContext
      value={{
        ...state,
        signInWithGoogle,
        signInWithTestAuth: e2eAuthConfig.enabled ? signInWithTestAuth : null,
        signInWithTestAuthB:
          e2eAuthConfig.enabled && e2eAuthConfig.emailB ? signInWithTestAuthB : null,
        signOut,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
