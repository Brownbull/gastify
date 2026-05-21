import { mobileConfig } from "./mobileConfig";
import type { ScanEvent } from "../stores/scanStore";

export const MAX_SCAN_SOCKET_RETRIES = 5;

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

type WebSocketEventHandler = (event: Event) => void;
type WebSocketMessageHandler = (event: MessageEvent) => void;
type WebSocketCloseHandler = (event: CloseEvent) => void;

export interface ScanWebSocketLike {
  onopen: WebSocketEventHandler | null;
  onmessage: WebSocketMessageHandler | null;
  onerror: WebSocketEventHandler | null;
  onclose: WebSocketCloseHandler | null;
  close: (code?: number, reason?: string) => void;
}

interface ScanProgressSocketOptions {
  scanId: string;
  tokenProvider: () => Promise<string | null>;
  onEvent: (event: ScanEvent) => void;
  onFatalError: (code: string, message: string) => void;
  onStatusChange: (
    status: "connecting" | "connected" | "reconnecting" | "closed",
    options?: { attempt?: number; message?: string | null },
  ) => void;
  socketFactory?: (url: string) => ScanWebSocketLike;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export class ScanProgressSocket {
  private socket: ScanWebSocketLike | null = null;
  private stopped = false;
  private retryAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private terminalEventReceived = false;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;

  constructor(private readonly options: ScanProgressSocketOptions) {
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
            ? "Connecting to scan progress"
            : `Reconnecting to scan progress (${this.retryAttempt}/${MAX_SCAN_SOCKET_RETRIES})`,
      },
    );

    let token: string | null;
    try {
      token = await this.options.tokenProvider();
    } catch {
      this.fail("auth_error", "Failed to refresh scan stream token");
      return;
    }

    if (!token) {
      this.fail("auth_error", "Sign in again to follow scan progress");
      return;
    }

    if (this.stopped || this.terminalEventReceived) return;

    const url = buildScanWebSocketUrl(mobileConfig.apiBaseUrl, this.options.scanId, token);
    const socket = (this.options.socketFactory ?? defaultSocketFactory)(url);
    this.socket = socket;

    socket.onopen = () => {
      this.retryAttempt = 0;
      this.options.onStatusChange("connected", {
        attempt: 0,
        message: "Connected to scan progress",
      });
    };

    socket.onmessage = (message) => {
      if (this.stopped || this.terminalEventReceived) return;
      if (typeof message.data !== "string") return;

      let event: ScanEvent;
      try {
        const parsed: unknown = JSON.parse(message.data);
        if (!isScanEvent(parsed)) return;
        event = parsed;
      } catch {
        return;
      }

      this.options.onEvent(event);

      if (event.event_type === "scan_complete" || event.event_type === "scan_failed") {
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
        this.fail("auth_error", event.reason || "Scan stream authentication failed");
        return;
      }
      if (event?.code === 4004) {
        this.fail("scan_not_found", event.reason || "Scan was not found");
        return;
      }

      this.handleDisconnect();
    };
  }

  private handleDisconnect() {
    if (this.stopped || this.terminalEventReceived || this.reconnectTimer) return;

    if (this.retryAttempt >= MAX_SCAN_SOCKET_RETRIES) {
      this.fail(
        "connection_lost",
        "Lost connection to scan progress. Check your connection and try again.",
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
      message: `Reconnecting to scan progress (${nextAttempt}/${MAX_SCAN_SOCKET_RETRIES})`,
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

export function buildScanWebSocketUrl(
  apiBaseUrl: string,
  scanId: string,
  token: string,
): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/scans/${encodeURIComponent(scanId)}`;
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}

function reconnectDelayMs(attempt: number): number {
  return Math.min(BASE_RECONNECT_DELAY_MS * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
}

function isScanEvent(data: unknown): data is ScanEvent {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).event_type === "string" &&
    typeof (data as Record<string, unknown>).scan_id === "string" &&
    typeof (data as Record<string, unknown>).step === "string" &&
    typeof (data as Record<string, unknown>).progress_pct === "number"
  );
}

function defaultSocketFactory(url: string): ScanWebSocketLike {
  return new WebSocket(url);
}
