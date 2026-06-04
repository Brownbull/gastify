import auth, { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearMobileSession,
  syncMobileAuthToken,
} from "../lib/authSession";
import { configureE2EFirebaseAuth } from "../lib/e2eFirebaseAuth";
import { configureGoogleSignIn } from "../lib/googleSignIn";
import { mobileConfig } from "../lib/mobileConfig";
import { unregisterCurrentPushToken } from "../lib/pushNotifications";
import { hydrateActiveScope, useScopeStore } from "../stores/scopeStore";

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithTestUser: () => Promise<void>;
  signInWithTestUserB: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const authEventSequenceRef = useRef(0);

  useEffect(() => {
    configureGoogleSignIn();
    configureE2EFirebaseAuth();

    let initialAuthSettled = false;
    let mounted = true;
    let authWork = Promise.resolve();

    const settleAuthState = async (
      firebaseUser: FirebaseAuthTypes.User | null,
      authEventSequence: number,
    ) => {
      const isCurrentAuthEvent = () =>
        mounted && authEventSequence === authEventSequenceRef.current;

      if (!isCurrentAuthEvent()) return;

      if (!firebaseUser) {
        await clearMobileSession();
        // Drop any group scope so it never leaks into the next signed-in account.
        useScopeStore.getState().reset();
        if (!isCurrentAuthEvent()) return;
        setState({ user: null, loading: false, error: null });
        return;
      }

      try {
        const tokenApplied = await syncMobileAuthToken(
          firebaseUser,
          isCurrentAuthEvent,
        );
        if (!tokenApplied || !isCurrentAuthEvent()) return;
        setState({ user: firebaseUser, loading: false, error: null });
        // Restore the user's last group scope (shape-validated; personal otherwise).
        void hydrateActiveScope();
      } catch (err: unknown) {
        if (!isCurrentAuthEvent()) return;
        await clearMobileSession();
        if (!isCurrentAuthEvent()) return;
        setState({
          user: null,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to sync token",
        });
      }
    };

    const enqueueAuthState = (firebaseUser: FirebaseAuthTypes.User | null) => {
      const authEventSequence = ++authEventSequenceRef.current;
      initialAuthSettled = true;
      authWork = authWork.then(() =>
        settleAuthState(firebaseUser, authEventSequence),
      );
      void authWork.catch(() => undefined);
    };

    const unsubscribe = auth().onIdTokenChanged((firebaseUser) => {
      enqueueAuthState(firebaseUser);
    });

    const initialAuthFallback = setTimeout(() => {
      if (!initialAuthSettled) {
        enqueueAuthState(auth().currentUser);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(initialAuthFallback);
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithGoogle: async () => {
        setState((prev) => ({ ...prev, error: null }));
        try {
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });
          const signInResult = await GoogleSignin.signIn();
          const idToken = extractGoogleIdToken(signInResult);

          if (!idToken) {
            throw new Error("Google sign-in did not return an ID token");
          }

          const credential = auth.GoogleAuthProvider.credential(idToken);
          await auth().signInWithCredential(credential);
        } catch (err: unknown) {
          if (
            isErrorWithCode(err) &&
            err.code === statusCodes.SIGN_IN_CANCELLED
          ) {
            return;
          }

          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Sign-in failed",
          }));
        }
      },
      signInWithTestUser: async () => {
        setState((prev) => ({ ...prev, error: null }));
        try {
          if (
            !mobileConfig.e2eAuthEnabled ||
            !mobileConfig.e2eAuthEmail ||
            !mobileConfig.e2eAuthPassword
          ) {
            throw new Error("E2E auth is not configured");
          }

          configureE2EFirebaseAuth();
          await auth().signInWithEmailAndPassword(
            mobileConfig.e2eAuthEmail,
            mobileConfig.e2eAuthPassword,
          );
        } catch (err: unknown) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Test sign-in failed",
          }));
        }
      },
      signInWithTestUserB: async () => {
        setState((prev) => ({ ...prev, error: null }));
        try {
          if (
            !mobileConfig.e2eAuthEnabled ||
            !mobileConfig.e2eAuthEmailB ||
            !mobileConfig.e2eAuthPasswordB
          ) {
            throw new Error("E2E auth (B) is not configured");
          }

          configureE2EFirebaseAuth();
          await auth().signInWithEmailAndPassword(
            mobileConfig.e2eAuthEmailB,
            mobileConfig.e2eAuthPasswordB,
          );
        } catch (err: unknown) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Test sign-in (B) failed",
          }));
        }
      },
      signOut: async () => {
        try {
          await unregisterCurrentPushToken();
        } catch {
          // Local cleanup below is still mandatory.
        }

        try {
          await GoogleSignin.signOut();
        } catch {
          // Local cleanup below is still mandatory.
        }

        try {
          await auth().signOut();
        } catch {
          // Native Firebase can fail on network; local session cleanup still wins.
        }

        await clearMobileSession();
        useScopeStore.getState().reset();
        setState({ user: null, loading: false, error: null });
      },
    }),
    [state],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

function extractGoogleIdToken(
  result: Awaited<ReturnType<typeof GoogleSignin.signIn>>,
): string | null {
  const response = result as {
    idToken?: unknown;
    data?: { idToken?: unknown } | null;
  };

  if (typeof response.idToken === "string") {
    return response.idToken;
  }

  if (typeof response.data?.idToken === "string") {
    return response.data.idToken;
  }

  return null;
}
