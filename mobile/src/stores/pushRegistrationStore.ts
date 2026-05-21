import { create } from "zustand";

export type PushPermissionStatus = "granted" | "denied" | "undetermined";

export type PushRegistrationStatus =
  | "idle"
  | "requesting"
  | "registered"
  | "denied"
  | "failed"
  | "unregistered";

interface PushRegistrationState {
  status: PushRegistrationStatus;
  permissionStatus: PushPermissionStatus;
  token: string | null;
  errorMessage: string | null;
  registeredAt: string | null;
  setRequesting: () => void;
  setRegistered: (token: string, registeredAt: string | null) => void;
  setDenied: (permissionStatus: PushPermissionStatus) => void;
  setFailed: (message: string) => void;
  setUnregistered: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  status: "idle" as PushRegistrationStatus,
  permissionStatus: "undetermined" as PushPermissionStatus,
  token: null,
  errorMessage: null,
  registeredAt: null,
};

export const usePushRegistrationStore = create<PushRegistrationState>()((set) => ({
  ...INITIAL_STATE,
  setRequesting: () =>
    set((state) => ({
      ...state,
      status: "requesting",
      errorMessage: null,
    })),
  setRegistered: (token, registeredAt) =>
    set({
      status: "registered",
      permissionStatus: "granted",
      token,
      errorMessage: null,
      registeredAt,
    }),
  setDenied: (permissionStatus) =>
    set({
      status: "denied",
      permissionStatus,
      token: null,
      errorMessage: null,
      registeredAt: null,
    }),
  setFailed: (message) =>
    set((state) => ({
      ...state,
      status: "failed",
      errorMessage: message,
    })),
  setUnregistered: () =>
    set({
      status: "unregistered",
      permissionStatus: "undetermined",
      token: null,
      errorMessage: null,
      registeredAt: null,
    }),
  reset: () => set(INITIAL_STATE),
}));
