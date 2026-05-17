import * as SecureStore from "expo-secure-store";
import {
  clearSecureAuthToken,
  getSecureAuthToken,
  saveSecureAuthToken,
} from "../secureAuthToken";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

describe("secureAuthToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the mirrored auth token from SecureStore", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue("token-123");

    await expect(getSecureAuthToken()).resolves.toBe("token-123");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("gastify.authToken");
  });

  it("saves the mirrored auth token with device-only keychain access", async () => {
    await saveSecureAuthToken("token-456");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "gastify.authToken",
      "token-456",
      { keychainAccessible: "WHEN_UNLOCKED_THIS_DEVICE_ONLY" },
    );
  });

  it("clears the mirrored auth token", async () => {
    await clearSecureAuthToken();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "gastify.authToken",
    );
  });
});
