import { create } from "zustand";
import {
  getPreferredLocale,
  setPreferredLocale,
  type SupportedLocale,
} from "@/lib/i18n";

interface UiState {
  sidebarOpen: boolean;
  locale: SupportedLocale;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: SupportedLocale) => void;
  reset: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  locale: getPreferredLocale(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLocale: (locale) => {
    setPreferredLocale(locale);
    set({ locale });
  },
  reset: () => set({ sidebarOpen: false, locale: getPreferredLocale() }),
}));
