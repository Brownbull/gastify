import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";
import { mobileConfig } from "./mobileConfig";
import { usePushRegistrationStore } from "../stores/pushRegistrationStore";
import type { PushPermissionStatus } from "../stores/pushRegistrationStore";

export type PushTokenResponse = components["schemas"]["PushTokenResponse"];
export type PushTokenUnregisterResponse =
  components["schemas"]["PushTokenUnregisterResponse"];

interface PushRegistrationResult {
  status: "registered" | "denied";
  permissionStatus: PushPermissionStatus;
  token: string | null;
  registeredAt: string | null;
}

export async function registerDevicePushToken(): Promise<PushRegistrationResult> {
  const permissionStatus = await requestNotificationPermission();
  if (permissionStatus !== "granted") {
    return {
      status: "denied",
      permissionStatus,
      token: null,
      registeredAt: null,
    };
  }

  await configureAndroidNotificationChannel();
  const token = await getExpoPushToken();
  const registration = await registerPushToken({
    app_environment: mobileConfig.appEnvironment,
    app_version: Constants.expoConfig?.version ?? null,
    permission_status: "granted",
    platform: Platform.OS === "ios" ? "ios" : "android",
    provider: "expo",
    token,
  });

  return {
    status: "registered",
    permissionStatus: "granted",
    token: registration.token,
    registeredAt: registration.registered_at,
  };
}

export async function unregisterCurrentPushToken(): Promise<PushTokenUnregisterResponse | null> {
  const token = usePushRegistrationStore.getState().token;
  if (!token) return null;
  return unregisterPushToken(token);
}

export async function registerPushToken(
  body: components["schemas"]["PushTokenRegistration"],
): Promise<PushTokenResponse> {
  const { data, error } = await apiClient.POST("/api/v1/push-tokens", {
    body,
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to register push token"));
  }

  return data;
}

export async function unregisterPushToken(
  token?: string | null,
): Promise<PushTokenUnregisterResponse> {
  const { data, error } = await apiClient.POST("/api/v1/push-tokens/unregister", {
    body: token ? { token } : {},
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to unregister push token"));
  }

  return data;
}

async function requestNotificationPermission(): Promise<PushPermissionStatus> {
  const existing = await Notifications.getPermissionsAsync();
  let status = normalizePermissionStatus(existing.status);

  if (status === "undetermined") {
    const requested = await Notifications.requestPermissionsAsync();
    status = normalizePermissionStatus(requested.status);
  }

  return status;
}

async function configureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    importance: Notifications.AndroidImportance.DEFAULT,
    name: "Default",
  });
}

async function getExpoPushToken(): Promise<string> {
  const projectId = getExpoProjectId();
  if (!projectId) {
    throw new Error("Expo project id is required for push registration");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

function getExpoProjectId(): string | undefined {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;

  return constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

function normalizePermissionStatus(status: string): PushPermissionStatus {
  if (status === "granted" || status === "denied") return status;
  return "undetermined";
}
