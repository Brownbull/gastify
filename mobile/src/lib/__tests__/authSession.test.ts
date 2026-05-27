import { clearMobileSession, syncMobileAuthToken } from "../authSession";
import { setAuthToken } from "../api";
import { queryClient } from "../queryClient";
import {
  clearSecureAuthToken,
  saveSecureAuthToken,
} from "../secureAuthToken";
import { useScanStore } from "../../stores/scanStore";
import { useStatementStore } from "../../stores/statementStore";
import { useSessionStore } from "../../stores/sessionStore";

jest.mock("../api", () => ({
  setAuthToken: jest.fn(),
}));

jest.mock("../queryClient", () => ({
    queryClient: {
      cancelQueries: jest.fn(),
      clear: jest.fn(),
    },
}));

jest.mock("../secureAuthToken", () => ({
  clearSecureAuthToken: jest.fn(),
  saveSecureAuthToken: jest.fn(),
}));

describe("authSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScanStore.getState().reset();
    useStatementStore.getState().reset();
    useSessionStore.getState().reset();
  });

  it("syncs Firebase ID token into API memory, SecureStore, and session store", async () => {
    await syncMobileAuthToken({
      displayName: "Test User",
      email: "test@example.com",
      getIdToken: jest.fn().mockResolvedValue("firebase-token"),
      uid: "firebase-uid",
    } as never);

    expect(setAuthToken).toHaveBeenCalledWith("firebase-token");
    expect(saveSecureAuthToken).toHaveBeenCalledWith("firebase-token");
    expect(useSessionStore.getState().signedInUser).toEqual({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });
  });

  it("skips token commits when the auth event is already stale", async () => {
    await expect(
      syncMobileAuthToken(
        {
          displayName: "Test User",
          email: "test@example.com",
          getIdToken: jest.fn().mockResolvedValue("firebase-token"),
          uid: "firebase-uid",
        } as never,
        () => false,
      ),
    ).resolves.toBe(false);

    expect(setAuthToken).not.toHaveBeenCalledWith("firebase-token");
    expect(saveSecureAuthToken).not.toHaveBeenCalled();
    expect(useSessionStore.getState().signedInUser).toBeNull();
  });

  it("removes a token saved by an auth event that becomes stale mid-commit", async () => {
    let shouldApply = true;
    jest.mocked(saveSecureAuthToken).mockImplementation(async () => {
      shouldApply = false;
    });

    await expect(
      syncMobileAuthToken(
        {
          displayName: "Test User",
          email: "test@example.com",
          getIdToken: jest.fn().mockResolvedValue("firebase-token"),
          uid: "firebase-uid",
        } as never,
        () => shouldApply,
      ),
    ).resolves.toBe(false);

    expect(saveSecureAuthToken).toHaveBeenCalledWith("firebase-token");
    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(clearSecureAuthToken).toHaveBeenCalled();
    expect(useSessionStore.getState().signedInUser).toBeNull();
  });

  it("clears all mobile session state on sign-out", async () => {
    useSessionStore.getState().setSignedInUser({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });
    useScanStore.getState().startUpload({
      uri: "file:///tmp/receipt.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      source: "camera",
    });
    useStatementStore.getState().startUpload({
      uri: "file:///tmp/statement.pdf",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
    });

    await clearMobileSession();

    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(clearSecureAuthToken).toHaveBeenCalled();
    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(useScanStore.getState().phase).toBe("idle");
    expect(useStatementStore.getState().phase).toBe("idle");
    expect(useSessionStore.getState().signedInUser).toBeNull();
  });

  it("clears query and store state even if SecureStore deletion fails", async () => {
    const secureStoreError = new Error("SecureStore unavailable");
    jest.mocked(clearSecureAuthToken).mockRejectedValue(secureStoreError);
    useSessionStore.getState().setSignedInUser({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });

    await expect(clearMobileSession()).resolves.toEqual({
      secureTokenCleared: false,
      secureTokenError: secureStoreError,
    });

    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(useSessionStore.getState().signedInUser).toBeNull();
  });
});
