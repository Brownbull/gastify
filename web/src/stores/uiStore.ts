import { create } from "zustand";
import {
  getPreferredLocale,
  setPreferredLocale,
  type SupportedLocale,
} from "@/lib/i18n";

/**
 * The scope the whole app reads/writes under (D70). Personal by default; a group
 * scope re-points every scope-aware view (dashboard, trends, transactions) at that
 * group, and the server validates membership + swaps the RLS GUC per request.
 */
type ActiveScope =
  | { kind: "personal" }
  | { kind: "group"; id: string; name: string };

const STORAGE_KEY_SCOPE = "gastify:activeScope";

const PERSONAL_SCOPE: ActiveScope = { kind: "personal" };

function getStoredScope(): ActiveScope {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCOPE);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveScope;
      if (parsed?.kind === "group" && typeof parsed.id === "string" && parsed.name) {
        return parsed;
      }
    }
  } catch {
    // ignore malformed storage; fall back to personal
  }
  return PERSONAL_SCOPE;
}

interface UiState {
  sidebarOpen: boolean;
  locale: SupportedLocale;
  activeScope: ActiveScope;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: SupportedLocale) => void;
  setActiveScope: (scope: ActiveScope) => void;
  reset: () => void;
}

export type { ActiveScope };

/**
 * UI store. Theme is a single Playful Geometric light theme (DM-1) driven
 * entirely by CSS tokens (styles/tokens.css) — there is no runtime theme/mode
 * switching. The warm 3-theme × light/dark switcher was removed in W1 (D-B).
 */
export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  locale: getPreferredLocale(),
  activeScope: getStoredScope(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLocale: (locale) => {
    setPreferredLocale(locale);
    set({ locale });
  },
  setActiveScope: (activeScope) => {
    if (activeScope.kind === "group") {
      localStorage.setItem(STORAGE_KEY_SCOPE, JSON.stringify(activeScope));
    } else {
      localStorage.removeItem(STORAGE_KEY_SCOPE);
    }
    set({ activeScope });
  },
  reset: () => {
    localStorage.removeItem(STORAGE_KEY_SCOPE);
    set({
      sidebarOpen: false,
      locale: getPreferredLocale(),
      activeScope: PERSONAL_SCOPE,
    });
  },
}));
