import { mobileConfig } from "./mobileConfig";
import {
  TERMINAL_STATEMENT_EVENTS,
  type StatementEvent,
} from "../stores/statementStore";
import type { ScanWebSocketLike } from "./scanProgressSocket";

export const MAX_STATEMENT_SOCKET_RETRIES = 5;

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

interface StatementProgressSocketOptions {
  statementId: string;
  tokenProvider: () => Promise<string | null>;
  onEvent: (event: StatementEvent) => void;
  onFatalError: (code: string, message: string) => void;
  onStatusChange: (
    status: "connecting" | "connected" | "reconnecting" | "closed",
    options?: { attempt?: number; message?: string | null },
  ) => void;
  socketFactory?: (url: string) => ScanWebSocketLike;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export class StatementProgressSocket {
  private socket: ScanWebSocketLike | null = null;
  private stopped = false;
  private retryAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private terminalEventReceived = false;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;

  constructor(private readonly options: StatementProgressSocketOptions) {
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
  }

  start() {
    this.stopped = false;
    this.terminalEventReceived = false;
    void this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) {
      this.clearTimer(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.options.onStatusChange("closed");
  }

  private async connect() {
    if (this.stopped || this.terminalEventReceived) return;

    this.options.onStatusChange(
      this.retryAttempt === 0 ? "connecting" : "reconnecting",
      {
        attempt: this.retryAttempt,
        message:
          this.retryAttempt === 0
            ? "Connecting to statement progress"
            : `Reconnecting to statement progress (${this.retryAttempt}/${MAX_STATEMENT_SOCKET_RETRIES})`,
      },
    );

    let token: string | null;
    try {
      token = await this.options.tokenProvider();
    } catch {
      this.fail("auth_error", "Failed to refresh statement stream token");
      return;
    }

    if (!token) {
      this.fail("auth_error", "Sign in again to follow statement progress");
      return;
    }

    if (this.stopped || this.terminalEventReceived) return;

    const url = buildStatementWebSocketUrl(
      mobileConfig.apiBaseUrl,
      this.options.statementId,
      token,
    );
    const socket = (this.options.socketFactory ?? defaultSocketFactory)(url);
    this.socket = socket;

    socket.onopen = () => {
      this.retryAttempt = 0;
      this.options.onStatusChange("connected", {
        attempt: 0,
        message: "Connected to statement progress",
      });
    };

    socket.onmessage = (message) => {
      if (this.stopped || this.terminalEventReceived) return;
      if (typeof message.data !== "string") return;

      let event: StatementEvent;
      try {
        const parsed: unknown = JSON.parse(message.data);
        if (!isStatementEvent(parsed)) return;
        event = parsed;
      } catch {
        return;
      }

      this.options.onEvent(event);

      if (TERMINAL_STATEMENT_EVENTS.has(event.event_type)) {
        this.terminalEventReceived = true;
        this.stop();
      }
    };

    socket.onerror = () => {
      this.handleDisconnect();
    };

    socket.onclose = (event) => {
      if (this.stopped || this.terminalEventReceived) return;

      if (event?.code === 4001) {
        this.fail("auth_error", event.reason || "Statement stream authentication failed");
        return;
      }
      if (event?.code === 4004) {
        this.fail("statement_not_found", event.reason || "Statement was not found");
        return;
      }

      this.handleDisconnect();
    };
  }

  private handleDisconnect() {
    if (this.stopped || this.terminalEventReceived || this.reconnectTimer) return;

    if (this.retryAttempt >= MAX_STATEMENT_SOCKET_RETRIES) {
      this.fail(
        "connection_lost",
        "Lost connection to statement progress. Check your connection and try again.",
      );
      return;
    }

    const nextAttempt = this.retryAttempt + 1;
    const delay = reconnectDelayMs(this.retryAttempt);
    this.retryAttempt = nextAttempt;
    const socket = this.socket;
    this.socket = null;

    this.options.onStatusChange("reconnecting", {
      attempt: nextAttempt,
      message: `Reconnecting to statement progress (${nextAttempt}/${MAX_STATEMENT_SOCKET_RETRIES})`,
    });

    this.reconnectTimer = this.setTimer(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
    socket?.close();
  }

  private fail(code: string, message: string) {
    this.stopped = true;
    if (this.reconnectTimer) {
      this.clearTimer(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.options.onFatalError(code, message);
    this.options.onStatusChange("closed", { message: null });
    this.socket?.close();
    this.socket = null;
  }
}

export function buildStatementWebSocketUrl(
  apiBaseUrl: string,
  statementId: string,
  token: string,
): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/statements/${encodeURIComponent(statementId)}`;
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

function reconnectDelayMs(attempt: number): number {
  return Math.min(BASE_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
}

function isStatementEvent(data: unknown): data is StatementEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).event_type === "string" &&
    typeof (data as Record<string, unknown>).statement_id === "string" &&
    typeof (data as Record<string, unknown>).step === "string" &&
    typeof (data as Record<string, unknown>).progress_pct === "number"
  );
}

function defaultSocketFactory(url: string): ScanWebSocketLike {
  return new WebSocket(url);
}
