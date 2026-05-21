import { useCallback } from "react";
import {
  registerDevicePushToken,
  unregisterPushToken,
} from "../lib/pushNotifications";
import { usePushRegistrationStore } from "../stores/pushRegistrationStore";

export function usePushRegistration() {
  const status = usePushRegistrationStore((state) => state.status);
  const permissionStatus = usePushRegistrationStore(
    (state) => state.permissionStatus,
  );
  const token = usePushRegistrationStore((state) => state.token);
  const errorMessage = usePushRegistrationStore((state) => state.errorMessage);
  const registeredAt = usePushRegistrationStore((state) => state.registeredAt);
  const setRequesting = usePushRegistrationStore((state) => state.setRequesting);
  const setRegistered = usePushRegistrationStore((state) => state.setRegistered);
  const setDenied = usePushRegistrationStore((state) => state.setDenied);
  const setFailed = usePushRegistrationStore((state) => state.setFailed);
  const setUnregistered = usePushRegistrationStore(
    (state) => state.setUnregistered,
  );

  const register = useCallback(async () => {
    setRequesting();
    try {
      const result = await registerDevicePushToken();
      if (result.status === "denied") {
        setDenied(result.permissionStatus);
        return;
      }
      if (!result.token) {
        throw new Error("Push registration did not return a token");
      }

      setRegistered(result.token, result.registeredAt);
    } catch (err: unknown) {
      setFailed(
        err instanceof Error ? err.message : "Push registration failed",
      );
    }
  }, [setDenied, setFailed, setRegistered, setRequesting]);

  const unregister = useCallback(async () => {
    setRequesting();
    try {
      await unregisterPushToken(token);
      setUnregistered();
    } catch (err: unknown) {
      setFailed(
        err instanceof Error ? err.message : "Push unregister failed",
      );
    }
  }, [setFailed, setRequesting, setUnregistered, token]);

  return {
    errorMessage,
    isRegistering: status === "requesting",
    permissionStatus,
    register,
    registeredAt,
    status,
    token,
    unregister,
  };
}
