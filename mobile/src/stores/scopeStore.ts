import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

/**
 * The scope the whole app reads under (D70), mirroring the web `uiStore.activeScope`.
 * Personal by default; a group scope re-points every scope-aware view (dashboard,
 * trends) at that group, and the server validates membership + swaps the RLS GUC
 * per request. Persisted to SecureStore so a chosen group survives an app restart;
 * `reset()` (called on sign-out) clears it so scope never leaks across accounts.
 */
export type ActiveScope =
  | { kind: "personal" }
  | { kind: "group"; id: string; name: string };

const PERSONAL_SCOPE: ActiveScope = { kind: "personal" };
const SCOPE_KEY = "gastify.activeScope";

// Fire-and-forget persistence. Scope is non-sensitive but SecureStore is the app's
// existing storage; errors are swallowed so a storage hiccup never breaks scope.
function persistScope(scope: ActiveScope): void {
  if (scope.kind === "group") {
    void SecureStore.setItemAsync(SCOPE_KEY, JSON.stringify(scope)).catch(() => undefined);
  } else {
    void SecureStore.deleteItemAsync(SCOPE_KEY).catch(() => undefined);
  }
}

interface ScopeState {
  activeScope: ActiveScope;
  setActiveScope: (scope: ActiveScope) => void;
  reset: () => void;
}

export const useScopeStore = create<ScopeState>()((set) => ({
  activeScope: PERSONAL_SCOPE,
  setActiveScope: (activeScope) => {
    persistScope(activeScope);
    set({ activeScope });
  },
  reset: () => {
    void SecureStore.deleteItemAsync(SCOPE_KEY).catch(() => undefined);
    set({ activeScope: PERSONAL_SCOPE });
  },
}));

/**
 * Restore a persisted group scope once at startup (after auth confirms a user).
 * Shape-validated, mirroring the web store's `getStoredScope` guard. Safe to call
 * repeatedly; a malformed/absent value falls back to the in-memory personal scope.
 */
export async function hydrateActiveScope(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(SCOPE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ActiveScope;
    if (parsed?.kind === "group" && typeof parsed.id === "string" && parsed.name) {
      useScopeStore.setState({ activeScope: parsed });
    }
  } catch {
    // ignore malformed / unavailable storage; keep personal scope
  }
}

/** The active group id (undefined = personal) that scopes every insights query. */
export function activeGroupId(scope: ActiveScope): string | undefined {
  return scope.kind === "group" ? scope.id : undefined;
}
