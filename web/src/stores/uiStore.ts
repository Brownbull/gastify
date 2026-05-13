import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  sidebarOpen: false,
};

export const useUiStore = create<UiState>()((set) => ({
  ...INITIAL_STATE,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  reset: () => set(INITIAL_STATE),
}));
