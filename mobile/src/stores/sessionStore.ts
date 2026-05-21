import { create } from "zustand";

interface SignedInUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

interface SessionState {
  signedInUser: SignedInUser | null;
  sessionVersion: number;
  setSignedInUser: (user: SignedInUser) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  signedInUser: null,
  sessionVersion: 0,
  setSignedInUser: (user) =>
    set((state) => ({
      signedInUser: user,
      sessionVersion: state.sessionVersion + 1,
    })),
  reset: () =>
    set((state) => ({
      signedInUser: null,
      sessionVersion: state.sessionVersion + 1,
    })),
}));

export function isActiveMobileSession(sessionVersion: number): boolean {
  const state = useSessionStore.getState();
  return state.signedInUser !== null && state.sessionVersion === sessionVersion;
}
