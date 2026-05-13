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
        setAuthToken(null);
      }
      setState({ user, loading: false, error: null });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!state.user) return;

    const interval = setInterval(async () => {
      try {
        const token = await state.user!.getIdToken(true);
        setAuthToken(token);
      } catch {
        setAuthToken(null);
        setState({ user: null, loading: false, error: "Session expired" });
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.user]);

  async function signInWithGoogle() {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed";
      setState((prev) => ({ ...prev, error: message }));
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setAuthToken(null);
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
