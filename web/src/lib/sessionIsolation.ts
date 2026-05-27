import { setAuthToken } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useScanStore } from "@/stores/scanStore";
import { useStatementStore } from "@/stores/statementStore";
import { useUiStore } from "@/stores/uiStore";

export const SIGN_OUT_BROADCAST_KEY = "gastify:sign-out";

interface ClearClientSessionOptions {
  clearWebStorage?: boolean;
  preserveBroadcastMarker?: boolean;
}

export function clearClientSession({
  clearWebStorage = true,
  preserveBroadcastMarker = false,
}: ClearClientSessionOptions = {}) {
  setAuthToken(null);
  queryClient.clear();
  useScanStore.getState().reset();
  useStatementStore.getState().reset();
  useUiStore.getState().reset();

  if (!clearWebStorage || typeof window === "undefined") return;

  if (preserveBroadcastMarker) {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && key !== SIGN_OUT_BROADCAST_KEY) {
        window.localStorage.removeItem(key);
      }
    }
  } else {
    window.localStorage.clear();
  }

  window.sessionStorage.clear();
}

export function broadcastSignOut() {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SIGN_OUT_BROADCAST_KEY,
    JSON.stringify({ at: Date.now() }),
  );
}

export function isSignOutBroadcast(event: StorageEvent) {
  return (
    event.storageArea === window.localStorage &&
    event.key === SIGN_OUT_BROADCAST_KEY &&
    event.newValue !== null
  );
}
