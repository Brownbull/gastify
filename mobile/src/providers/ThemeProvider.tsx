import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

type ColorTheme = "normal" | "professional" | "mono";
type ThemeMode = "light" | "dark";

interface ThemeColors {
  bg: string;
  bgSecondary: string;
  surface: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderLight: string;
  borderMedium: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
}

const THEMES: Record<ColorTheme, Record<ThemeMode, ThemeColors>> = {
  normal: {
    light: {
      bg: "#f5f0e8",
      bgSecondary: "#ffffff",
      surface: "#ffffff",
      primary: "#4a7c59",
      primaryHover: "#3d6b4a",
      primaryLight: "#d4e5d9",
      secondary: "#5b8fa8",
      accent: "#e8a87c",
      success: "#7d9b5f",
      warning: "#f59e0b",
      error: "#ef4444",
      textPrimary: "#2d3a4a",
      textSecondary: "#4a5568",
      textTertiary: "#7d9b5f",
      borderLight: "#e3bba1",
      borderMedium: "#d4a574",
      chart1: "#4a7c59",
      chart2: "#f59e0b",
      chart3: "#8b5cf6",
      chart4: "#9ca3af",
      chart5: "#5b8fa8",
      chart6: "#e8a87c",
    },
    dark: {
      bg: "#1a2420",
      bgSecondary: "#243028",
      surface: "#243028",
      primary: "#6b9e7a",
      primaryHover: "#5a8a68",
      primaryLight: "#2d3d32",
      secondary: "#7ba8be",
      accent: "#d4a574",
      success: "#8fbf9c",
      warning: "#fbbf24",
      error: "#f87171",
      textPrimary: "#e8e4dc",
      textSecondary: "#b8c4a8",
      textTertiary: "#6b8b5f",
      borderLight: "#3d4d42",
      borderMedium: "#4d5d52",
      chart1: "#6b9e7a",
      chart2: "#fbbf24",
      chart3: "#a78bfa",
      chart4: "#71717a",
      chart5: "#7ba8be",
      chart6: "#d4a574",
    },
  },
  professional: {
    light: {
      bg: "#f8fafc",
      bgSecondary: "#ffffff",
      surface: "#ffffff",
      primary: "#2563eb",
      primaryHover: "#1d4ed8",
      primaryLight: "#dbeafe",
      secondary: "#64748b",
      accent: "#0ea5e9",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textTertiary: "#94a3b8",
      borderLight: "#e2e8f0",
      borderMedium: "#cbd5e1",
      chart1: "#2563eb",
      chart2: "#22c55e",
      chart3: "#f59e0b",
      chart4: "#ef4444",
      chart5: "#8b5cf6",
      chart6: "#ec4899",
    },
    dark: {
      bg: "#0f172a",
      bgSecondary: "#1e293b",
      surface: "#1e293b",
      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryLight: "#1e3a5f",
      secondary: "#94a3b8",
      accent: "#38bdf8",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      textPrimary: "#f1f5f9",
      textSecondary: "#cbd5e1",
      textTertiary: "#64748b",
      borderLight: "#334155",
      borderMedium: "#475569",
      chart1: "#3b82f6",
      chart2: "#4ade80",
      chart3: "#fbbf24",
      chart4: "#f87171",
      chart5: "#a78bfa",
      chart6: "#f472b6",
    },
  },
  mono: {
    light: {
      bg: "#fafafa",
      bgSecondary: "#ffffff",
      surface: "#ffffff",
      primary: "#18181b",
      primaryHover: "#27272a",
      primaryLight: "#f4f4f5",
      secondary: "#52525b",
      accent: "#52525b",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      textPrimary: "#18181b",
      textSecondary: "#52525b",
      textTertiary: "#a1a1aa",
      borderLight: "#e4e4e7",
      borderMedium: "#d4d4d8",
      chart1: "#18181b",
      chart2: "#52525b",
      chart3: "#71717a",
      chart4: "#a1a1aa",
      chart5: "#d4d4d8",
      chart6: "#52525b",
    },
    dark: {
      bg: "#09090b",
      bgSecondary: "#18181b",
      surface: "#18181b",
      primary: "#3f3f46",
      primaryHover: "#52525b",
      primaryLight: "#27272a",
      secondary: "#a1a1aa",
      accent: "#a1a1aa",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      textPrimary: "#fafafa",
      textSecondary: "#d4d4d8",
      textTertiary: "#71717a",
      borderLight: "#27272a",
      borderMedium: "#3f3f46",
      chart1: "#3f3f46",
      chart2: "#a1a1aa",
      chart3: "#71717a",
      chart4: "#52525b",
      chart5: "#d4d4d8",
      chart6: "#a1a1aa",
    },
  },
};

const STORAGE_KEY_COLOR = "gastify.colorTheme";
const STORAGE_KEY_MODE = "gastify.themeMode";

interface ThemeContextValue {
  colors: ThemeColors;
  colorTheme: ColorTheme;
  themeMode: ThemeMode;
  setColorTheme: (theme: ColorTheme) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("normal");
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    systemScheme === "dark" ? "dark" : "light",
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedColor, storedMode] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY_COLOR),
        SecureStore.getItemAsync(STORAGE_KEY_MODE),
      ]);
      if (storedColor === "professional" || storedColor === "mono") {
        setColorThemeState(storedColor);
      }
      if (storedMode === "dark" || storedMode === "light") {
        setThemeModeState(storedMode);
      }
      setLoaded(true);
    })();
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    SecureStore.setItemAsync(STORAGE_KEY_COLOR, theme);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    SecureStore.setItemAsync(STORAGE_KEY_MODE, mode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      SecureStore.setItemAsync(STORAGE_KEY_MODE, next);
      return next;
    });
  }, []);

  const colors = THEMES[colorTheme][themeMode];

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ colors, colorTheme, themeMode, setColorTheme, setThemeMode, toggleThemeMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export type { ColorTheme, ThemeMode, ThemeColors };
