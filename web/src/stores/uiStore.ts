import { create } from "zustand";
import {
  getPreferredLocale,
  setPreferredLocale,
  type SupportedLocale,
} from "@/lib/i18n";

type ColorTheme = "normal" | "professional" | "mono";
type ThemeMode = "light" | "dark";

const STORAGE_KEY_COLOR_THEME = "gastify:colorTheme";
const STORAGE_KEY_MODE = "gastify:themeMode";

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
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: SupportedLocale) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  reset: () => void;
}

export type { ColorTheme, ThemeMode };

export const useUiStore = create<UiState>()((set, get) => {
  const initialColor = getStoredColorTheme();
  const initialMode = getStoredMode();
  applyThemeToDOM(initialColor, initialMode);

  return {
    sidebarOpen: false,
    locale: getPreferredLocale(),
    colorTheme: initialColor,
    themeMode: initialMode,
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
    reset: () => {
      localStorage.removeItem(STORAGE_KEY_COLOR_THEME);
      localStorage.removeItem(STORAGE_KEY_MODE);
      const colorTheme = "normal" as ColorTheme;
      const themeMode = "light" as ThemeMode;
      applyThemeToDOM(colorTheme, themeMode);
      set({ sidebarOpen: false, locale: getPreferredLocale(), colorTheme, themeMode });
    },
  };
});
