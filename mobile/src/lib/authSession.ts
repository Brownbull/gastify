import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { setAuthToken } from "./api";
import { queryClient } from "./queryClient";
import {
  clearSecureAuthToken,
  saveSecureAuthToken,
} from "./secureAuthToken";
import { useScanStore } from "../stores/scanStore";
import { useSessionStore } from "../stores/sessionStore";

export interface ClearMobileSessionResult {
  secureTokenCleared: boolean;
  secureTokenError: unknown | null;
}

export async function syncMobileAuthToken(
  user: FirebaseAuthTypes.User,
  shouldApply: () => boolean = () => true,
): Promise<boolean> {
  const token = await user.getIdToken();

  if (!shouldApply()) {
    return false;
  }

  await saveSecureAuthToken(token);

  if (!shouldApply()) {
    setAuthToken(null);
    try {
      await clearSecureAuthToken();
    } catch {
      // A newer auth event already owns session state; this stale cleanup is best-effort.
    }
    return false;
  }

  setAuthToken(token);
  useSessionStore.getState().setSignedInUser({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
  });

  return true;
}

export async function clearMobileSession(): Promise<ClearMobileSessionResult> {
  setAuthToken(null);
  let secureTokenError: unknown = null;

  try {
    await clearSecureAuthToken();
  } catch (err: unknown) {
    secureTokenError = err;
  }

  queryClient.clear();
  useScanStore.getState().reset();
  useSessionStore.getState().reset();

  return {
    secureTokenCleared: secureTokenError === null,
    secureTokenError,
  };
}
