import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearClientSession,
  broadcastSignOut,
  SIGN_OUT_BROADCAST_KEY,
} from "./sessionIsolation";
import { queryClient } from "@/lib/queryClient";
import { useScanStore } from "@/stores/scanStore";
import { useStatementStore } from "@/stores/statementStore";
import { useUiStore } from "@/stores/uiStore";

vi.mock("@/lib/api", () => ({
  setAuthToken: vi.fn(),
}));

describe("sessionIsolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    queryClient.clear();
    useScanStore.getState().reset();
    useStatementStore.getState().reset();
    useUiStore.getState().reset();
    vi.clearAllMocks();
  });

  it("clears cached queries, app stores, and browser storage", () => {
    queryClient.setQueryData(["transactions"], [{ id: "txn-1" }]);
    useScanStore.getState().startUpload();
    useStatementStore.getState().startUpload();
    useUiStore.getState().setSidebarOpen(true);
    window.localStorage.setItem("firebase:authUser:test", "secret");
    window.sessionStorage.setItem("draft", "merchant");

    clearClientSession();

    expect(queryClient.getQueryData(["transactions"])).toBeUndefined();
    expect(useScanStore.getState()).toMatchObject({
      phase: "idle",
      scanId: null,
      events: [],
    });
    expect(useStatementStore.getState()).toMatchObject({
      phase: "idle",
      statement: null,
      events: [],
    });
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("can preserve the logout marker while clearing storage", () => {
    window.localStorage.setItem(SIGN_OUT_BROADCAST_KEY, '{"at":1}');
    window.localStorage.setItem("cached-user", "private");

    clearClientSession({ preserveBroadcastMarker: true });

    expect(window.localStorage.getItem(SIGN_OUT_BROADCAST_KEY)).toBe(
      '{"at":1}',
    );
    expect(window.localStorage.getItem("cached-user")).toBeNull();
  });

  it("writes a storage marker for other tabs", () => {
    broadcastSignOut();

    expect(window.localStorage.getItem(SIGN_OUT_BROADCAST_KEY)).toContain("at");
  });
});
