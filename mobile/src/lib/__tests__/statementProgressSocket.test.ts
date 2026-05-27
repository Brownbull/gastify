import {
  MAX_STATEMENT_SOCKET_RETRIES,
  StatementProgressSocket,
  buildStatementWebSocketUrl,
} from "../statementProgressSocket";
import type { ScanWebSocketLike } from "../scanProgressSocket";

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

describe("statementProgressSocket", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it("builds the backend WebSocket URL with encoded statement id and token query", () => {
    const url = new URL(
      buildStatementWebSocketUrl(
        "https://api.example.test/base",
        "statement/123",
        "token 123",
      ),
    );

    expect(url.protocol).toBe("wss:");
    expect(url.pathname).toBe("/ws/statements/statement%2F123");
    expect(url.searchParams.get("token")).toBe("token 123");
  });

  it("opens the statement stream and closes after a terminal event", async () => {
    const socket = new FakeSocket();
    const socketFactory = jest.fn(() => socket);
    const onEvent = jest.fn();
    const onFatalError = jest.fn();
    const onStatusChange = jest.fn();

    const controller = new StatementProgressSocket({
      statementId: "statement-123",
      tokenProvider: jest.fn().mockResolvedValue("token-123"),
      onEvent,
      onFatalError,
      onStatusChange,
      socketFactory,
    });

    controller.start();
    await waitForSocketConnect();

    expect(socketFactory).toHaveBeenCalledWith(
      "ws://localhost:8000/ws/statements/statement-123?token=token-123",
    );
    expect(onStatusChange).toHaveBeenCalledWith("connecting", {
      attempt: 0,
      message: "Connecting to statement progress",
    });

    socket.emitOpen();
    expect(onStatusChange).toHaveBeenCalledWith("connected", {
      attempt: 0,
      message: "Connected to statement progress",
    });

    socket.emitMessage(
      JSON.stringify({
        event_type: "statement_completed",
        statement_id: "statement-123",
        step: "completed",
        progress_pct: 100,
        data: { status: "completed" },
      }),
    );

    expect(onEvent).toHaveBeenCalledWith({
      event_type: "statement_completed",
      statement_id: "statement-123",
      step: "completed",
      progress_pct: 100,
      data: { status: "completed" },
    });
    expect(socket.close).toHaveBeenCalled();
    expect(onFatalError).not.toHaveBeenCalled();
  });

  it("surfaces auth and missing-statement close codes as fatal statement errors", async () => {
    const socket = new FakeSocket();
    const onFatalError = jest.fn();
    const controller = new StatementProgressSocket({
      statementId: "statement-123",
      tokenProvider: jest.fn().mockResolvedValue("token-123"),
      onEvent: jest.fn(),
      onFatalError,
      onStatusChange: jest.fn(),
      socketFactory: jest.fn(() => socket),
    });

    controller.start();
    await waitForSocketConnect();

    socket.emitClose(4004, "missing");

    expect(onFatalError).toHaveBeenCalledWith("statement_not_found", "missing");
    expect(socket.close).toHaveBeenCalled();
  });

  it("reconnects with bounded attempts before failing the statement stream", async () => {
    jest.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const onFatalError = jest.fn();
    const onStatusChange = jest.fn();
    const controller = new StatementProgressSocket({
      statementId: "statement-123",
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

    for (let attempt = 1; attempt <= MAX_STATEMENT_SOCKET_RETRIES; attempt += 1) {
      sockets.at(-1)?.emitError();
      expect(onStatusChange).toHaveBeenCalledWith("reconnecting", {
        attempt,
        message: `Reconnecting to statement progress (${attempt}/${MAX_STATEMENT_SOCKET_RETRIES})`,
      });
      jest.runOnlyPendingTimers();
      await waitForSocketConnect();
    }

    sockets.at(-1)?.emitError();

    expect(onFatalError).toHaveBeenCalledWith(
      "connection_lost",
      "Lost connection to statement progress. Check your connection and try again.",
    );
  });
});
