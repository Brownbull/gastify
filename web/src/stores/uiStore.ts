import { create } from "zustand";
import {
  getPreferredLocale,
  setPreferredLocale,
  type SupportedLocale,
} from "@/lib/i18n";

type ColorTheme = "normal" | "professional" | "mono";
type ThemeMode = "light" | "dark";

/**
 * The scope the whole app reads/writes under (D70). Personal by default; a group
 * scope re-points every scope-aware view (dashboard, trends, transactions) at that
 * group, and the server validates membership + swaps the RLS GUC per request.
 */
type ActiveScope =
  | { kind: "personal" }
  | { kind: "group"; id: string; name: string };

const STORAGE_KEY_COLOR_THEME = "gastify:colorTheme";
const STORAGE_KEY_MODE = "gastify:themeMode";
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

function getStoredColorTheme(): ColorTheme {
  const stored = localStorage.getItem(STORAGE_KEY_COLOR_THEME);
  if (stored === "professional" || stored === "mono") return stored;
  return "normal";
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY_MODE);
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function applyThemeToDOM(colorTheme: ColorTheme, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (colorTheme !== "normal") {
    html.setAttribute("data-theme", colorTheme);
  } else {
    html.removeAttribute("data-theme");
  }
  if (mode === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

interface UiState {
  sidebarOpen: boolean;
  locale: SupportedLocale;
  colorTheme: ColorTheme;
  themeMode: ThemeMode;
  activeScope: ActiveScope;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: SupportedLocale) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setActiveScope: (scope: ActiveScope) => void;
  reset: () => void;
}

export type { ActiveScope, ColorTheme, ThemeMode };

export const useUiStore = create<UiState>()((set, get) => {
  const initialColor = getStoredColorTheme();
  const initialMode = getStoredMode();
  applyThemeToDOM(initialColor, initialMode);

  return {
    sidebarOpen: false,
    locale: getPreferredLocale(),
    colorTheme: initialColor,
    themeMode: initialMode,
    activeScope: getStoredScope(),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setLocale: (locale) => {
      setPreferredLocale(locale);
      set({ locale });
    },
    setColorTheme: (colorTheme) => {
      localStorage.setItem(STORAGE_KEY_COLOR_THEME, colorTheme);
      applyThemeToDOM(colorTheme, get().themeMode);
      set({ colorTheme });
    },
    setThemeMode: (mode) => {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
      applyThemeToDOM(get().colorTheme, mode);
      set({ themeMode: mode });
    },
    toggleThemeMode: () => {
      const next = get().themeMode === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY_MODE, next);
      applyThemeToDOM(get().colorTheme, next);
      set({ themeMode: next });
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
      localStorage.removeItem(STORAGE_KEY_COLOR_THEME);
      localStorage.removeItem(STORAGE_KEY_MODE);
      localStorage.removeItem(STORAGE_KEY_SCOPE);
      const colorTheme = "normal" as ColorTheme;
      const themeMode = "light" as ThemeMode;
      applyThemeToDOM(colorTheme, themeMode);
      set({
        sidebarOpen: false,
        locale: getPreferredLocale(),
        colorTheme,
        themeMode,
        activeScope: PERSONAL_SCOPE,
      });
    },
  };
});
