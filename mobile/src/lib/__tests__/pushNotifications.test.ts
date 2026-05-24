import * as Notifications from "expo-notifications";
import {
  registerDevicePushToken,
  registerPushToken,
  unregisterCurrentPushToken,
  unregisterPushToken,
} from "../pushNotifications";
import { apiClient } from "../api";
import { usePushRegistrationStore } from "../../stores/pushRegistrationStore";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock("../api", () => ({
  apiClient: {
    POST: jest.fn(),
  },
}));

const mockPost = jest.mocked(apiClient.POST);

describe("pushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers an Expo push token through the backend contract", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "undetermined",
    } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      status: "granted",
    } as never);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
      data: "ExponentPushToken[phase4]",
    } as never);
    mockPost.mockResolvedValue({
      data: {
        enabled: true,
        id: "push-1",
        token: "ExponentPushToken[phase4]",
        platform: "android",
        provider: "expo",
        permission_status: "granted",
        app_environment: "local",
        app_version: "0.0.0",
        registered_at: "2026-05-21T12:00:00Z",
        last_seen_at: "2026-05-21T12:00:00Z",
        revoked_at: null,
      },
      error: undefined,
      response: new Response(),
    } as never);

    await expect(registerDevicePushToken()).resolves.toMatchObject({
      status: "registered",
      token: "ExponentPushToken[phase4]",
    });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/push-tokens", {
      body: expect.objectContaining({
        permission_status: "granted",
        provider: "expo",
        token: "ExponentPushToken[phase4]",
      }),
    });
  });

  it("returns denied without registering when permission is denied", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "denied",
    } as never);

    await expect(registerDevicePushToken()).resolves.toEqual({
      status: "denied",
      permissionStatus: "denied",
      token: null,
      registeredAt: null,
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("surfaces backend registration errors", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { detail: "No auth" },
      response: new Response(null, { status: 401 }),
    } as never);

    await expect(
      registerPushToken({
        app_environment: "local",
        permission_status: "granted",
        platform: "android",
        provider: "expo",
        token: "ExponentPushToken[phase4]",
      }),
    ).rejects.toThrow("No auth");
  });

  it("unregisters the current backend token", async () => {
    mockPost.mockResolvedValue({
      data: { revoked_count: 1 },
      error: undefined,
      response: new Response(),
    } as never);

    await expect(unregisterPushToken("ExponentPushToken[phase4]")).resolves.toEqual({
      revoked_count: 1,
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/push-tokens/unregister", {
      body: { token: "ExponentPushToken[phase4]" },
    });
  });

  it("unregisterCurrentPushToken revokes all when store has no token", async () => {
    usePushRegistrationStore.getState().reset();
    mockPost.mockResolvedValue({
      data: { revoked_count: 2 },
      error: undefined,
      response: new Response(),
    } as never);

    await expect(unregisterCurrentPushToken()).resolves.toEqual({
      revoked_count: 2,
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/push-tokens/unregister", {
      body: {},
    });
  });

  it("unregisterCurrentPushToken sends stored token when available", async () => {
    usePushRegistrationStore
      .getState()
      .setRegistered("ExponentPushToken[stored]", "2026-05-21T12:00:00Z");
    mockPost.mockResolvedValue({
      data: { revoked_count: 1 },
      error: undefined,
      response: new Response(),
    } as never);

    await expect(unregisterCurrentPushToken()).resolves.toEqual({
      revoked_count: 1,
    });
    expect(mockPost).toHaveBeenCalledWith("/api/v1/push-tokens/unregister", {
      body: { token: "ExponentPushToken[stored]" },
    });
  });
});
