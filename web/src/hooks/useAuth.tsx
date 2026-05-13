import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
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

  async function signOut() {
    try {
      await firebaseSignOut(auth);
    } finally {
      clearClientSession();
      broadcastSignOut();
      setState({ user: null, loading: false, error: null });
    }
  }

  return (
    <AuthContext value={{ ...state, signInWithGoogle, signOut }}>
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
