import {
  MAX_SCAN_SOCKET_RETRIES,
  ScanProgressSocket,
  buildScanWebSocketUrl,
  type ScanWebSocketLike,
} from "../scanProgressSocket";

class FakeSocket implements ScanWebSocketLike {
  onopen: ScanWebSocketLike["onopen"] = null;
  onmessage: ScanWebSocketLike["onmessage"] = null;
  onerror: ScanWebSocketLike["onerror"] = null;
  onclose: ScanWebSocketLike["onclose"] = null;
  close = jest.fn();

  emitOpen() {
    this.onopen?.({} as Event);
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError() {
    this.onerror?.({} as Event);
  }

  emitClose(code?: number, reason?: string) {
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

function waitForSocketConnect() {
  return Promise.resolve();
}

describe("scanProgressSocket", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it("builds the backend WebSocket URL with encoded scan id and token query", () => {
    const url = new URL(
      buildScanWebSocketUrl("https://api.example.test/base", "scan/123", "token 123"),
    );

    expect(url.protocol).toBe("wss:");
    expect(url.pathname).toBe("/ws/scans/scan%2F123");
    expect(url.searchParams.get("token")).toBe("token 123");
  });

  it("opens the scan stream and closes after a terminal event", async () => {
    const socket = new FakeSocket();
    const socketFactory = jest.fn(() => socket);
    const onEvent = jest.fn();
    const onFatalError = jest.fn();
    const onStatusChange = jest.fn();

    const controller = new ScanProgressSocket({
      scanId: "scan-123",
      tokenProvider: jest.fn().mockResolvedValue("token-123"),
      onEvent,
      onFatalError,
      onStatusChange,
      socketFactory,
    });

    controller.start();
    await waitForSocketConnect();

    expect(socketFactory).toHaveBeenCalledWith(
      "ws://localhost:8000/ws/scans/scan-123?token=token-123",
    );
    expect(onStatusChange).toHaveBeenCalledWith("connecting", {
      attempt: 0,
      message: "Connecting to scan progress",
    });

    socket.emitOpen();
    expect(onStatusChange).toHaveBeenCalledWith("connected", {
      attempt: 0,
      message: "Connected to scan progress",
    });

    socket.emitMessage(
      JSON.stringify({
        event_type: "scan_complete",
        scan_id: "scan-123",
        step: "done",
        progress_pct: 100,
        data: { status: "completed" },
      }),
    );

    expect(onEvent).toHaveBeenCalledWith({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: { status: "completed" },
    });
    expect(socket.close).toHaveBeenCalled();
    expect(onFatalError).not.toHaveBeenCalled();
  });

  it("surfaces auth and missing-scan close codes as fatal scan errors", async () => {
    const socket = new FakeSocket();
    const onFatalError = jest.fn();
    const controller = new ScanProgressSocket({
      scanId: "scan-123",
      tokenProvider: jest.fn().mockResolvedValue("token-123"),
      onEvent: jest.fn(),
      onFatalError,
      onStatusChange: jest.fn(),
      socketFactory: jest.fn(() => socket),
    });

    controller.start();
    await waitForSocketConnect();

    socket.emitClose(4001, "expired");

    expect(onFatalError).toHaveBeenCalledWith("auth_error", "expired");
    expect(socket.close).toHaveBeenCalled();
  });

  it("reconnects with bounded attempts before failing the scan stream", async () => {
    jest.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const onFatalError = jest.fn();
    const onStatusChange = jest.fn();
    const controller = new ScanProgressSocket({
      scanId: "scan-123",
      tokenProvider: jest.fn().mockResolvedValue("token-123"),
      onEvent: jest.fn(),
      onFatalError,
      onStatusChange,
      socketFactory: jest.fn(() => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      }),
    });

    controller.start();
    await waitForSocketConnect();

    for (let attempt = 1; attempt <= MAX_SCAN_SOCKET_RETRIES; attempt += 1) {
      sockets.at(-1)?.emitError();
      expect(onStatusChange).toHaveBeenCalledWith("reconnecting", {
        attempt,
        message: `Reconnecting to scan progress (${attempt}/${MAX_SCAN_SOCKET_RETRIES})`,
      });
      jest.runOnlyPendingTimers();
      await waitForSocketConnect();
    }

    sockets.at(-1)?.emitError();

    expect(onFatalError).toHaveBeenCalledWith(
      "connection_lost",
      "Lost connection to scan progress. Check your connection and try again.",
    );
  });

  it("refreshes the Firebase token before reconnecting the scan stream", async () => {
    jest.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const tokenProvider = jest
      .fn()
      .mockResolvedValueOnce("token-1")
      .mockResolvedValueOnce("token-2");
    const socketFactory = jest.fn(() => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    });
    const controller = new ScanProgressSocket({
      scanId: "scan-123",
      tokenProvider,
      onEvent: jest.fn(),
      onFatalError: jest.fn(),
      onStatusChange: jest.fn(),
      socketFactory,
    });

    controller.start();
    await waitForSocketConnect();

    expect(socketFactory).toHaveBeenLastCalledWith(
      "ws://localhost:8000/ws/scans/scan-123?token=token-1",
    );

    sockets[0]?.emitError();
    jest.runOnlyPendingTimers();
    await waitForSocketConnect();

    expect(tokenProvider).toHaveBeenCalledTimes(2);
    expect(socketFactory).toHaveBeenLastCalledWith(
      "ws://localhost:8000/ws/scans/scan-123?token=token-2",
    );
  });
});
