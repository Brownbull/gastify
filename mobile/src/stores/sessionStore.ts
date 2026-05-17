import { create } from "zustand";

interface SignedInUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

interface SessionState {
  signedInUser: SignedInUser | null;
  setSignedInUser: (user: SignedInUser) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  signedInUser: null,
  setSignedInUser: (user) => set({ signedInUser: user }),
  reset: () => set({ signedInUser: null }),
}));
