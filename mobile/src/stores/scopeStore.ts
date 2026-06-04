import { create } from "zustand";

/**
 * The scope the whole app reads under (D70), mirroring the web `uiStore.activeScope`.
 * Personal by default; a group scope re-points every scope-aware view (dashboard,
 * trends) at that group, and the server validates membership + swaps the RLS GUC
 * per request. Kept in-memory for now (SecureStore persistence is a follow-up — the
 * S23 isolation proof exercises a single session).
 */
export type ActiveScope =
  | { kind: "personal" }
  | { kind: "group"; id: string; name: string };

const PERSONAL_SCOPE: ActiveScope = { kind: "personal" };

interface ScopeState {
  activeScope: ActiveScope;
  setActiveScope: (scope: ActiveScope) => void;
  reset: () => void;
}

export const useScopeStore = create<ScopeState>()((set) => ({
  activeScope: PERSONAL_SCOPE,
  setActiveScope: (activeScope) => set({ activeScope }),
  reset: () => set({ activeScope: PERSONAL_SCOPE }),
}));

/** The active group id (undefined = personal) that scopes every insights query. */
export function activeGroupId(scope: ActiveScope): string | undefined {
  return scope.kind === "group" ? scope.id : undefined;
}
