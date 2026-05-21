import { act, renderHook } from "@testing-library/react-native";
import { usePushRegistration } from "../usePushRegistration";
import {
  registerDevicePushToken,
  unregisterPushToken,
} from "../../lib/pushNotifications";
import { usePushRegistrationStore } from "../../stores/pushRegistrationStore";

jest.mock("../../lib/pushNotifications", () => ({
  registerDevicePushToken: jest.fn(),
  unregisterPushToken: jest.fn(),
}));

describe("usePushRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePushRegistrationStore.getState().reset();
  });

  it("stores successful push registration state", async () => {
    jest.mocked(registerDevicePushToken).mockResolvedValue({
      permissionStatus: "granted",
      registeredAt: "2026-05-21T12:00:00Z",
      status: "registered",
      token: "ExponentPushToken[phase4]",
    });
    const { result } = renderHook(() => usePushRegistration());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.status).toBe("registered");
    expect(result.current.token).toBe("ExponentPushToken[phase4]");
  });

  it("stores denied permission state without a token", async () => {
    jest.mocked(registerDevicePushToken).mockResolvedValue({
      permissionStatus: "denied",
      registeredAt: null,
      status: "denied",
      token: null,
    });
    const { result } = renderHook(() => usePushRegistration());

    await act(async () => {
      await result.current.register();
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.permissionStatus).toBe("denied");
    expect(result.current.token).toBeNull();
  });

  it("unregisters the stored token", async () => {
    usePushRegistrationStore
      .getState()
      .setRegistered("ExponentPushToken[phase4]", "2026-05-21T12:00:00Z");
    jest.mocked(unregisterPushToken).mockResolvedValue({ revoked_count: 1 });
    const { result } = renderHook(() => usePushRegistration());

    await act(async () => {
      await result.current.unregister();
    });

    expect(unregisterPushToken).toHaveBeenCalledWith("ExponentPushToken[phase4]");
    expect(result.current.status).toBe("unregistered");
  });
});
