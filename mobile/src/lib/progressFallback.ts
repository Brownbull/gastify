import { AppState, type AppStateStatus } from "react-native";

/**
 * Transport-agnostic REST polling fallback for scan/statement progress (ADR D62
 * Path A / D66). Activates only while the primary WebSocket is in distress
 * (or stalled), polls the authoritative Postgres-backed status row, and feeds
 * results through the existing store reducers via the injected `apply`. One
 * controller, two adapters — see scanProgressFallback.ts / statementProgressFallback.ts.
 */

export const FALLBACK_BASE_INTERVAL_MS = 2500;
export const FALLBACK_MAX_INTERVAL_MS = 15000;
export const FALLBACK_JITTER_RATIO = 0.25;
// The WS heartbeat is 15s (scan_event_heartbeat_interval_s). A healthy, connected
// WS can legitimately be silent for up to ~15s between beats, so the stall watchdog
// must sit well above that (>=2.5x) or it would misfire on every idle scan and
// double-deliver. 40s gives margin without leaving a truly-hung WS unnoticed for long.
export const FALLBACK_STALL_MS = 40000;
// Stop polling quietly after this many consecutive fetch failures (network/auth/5xx).
// The server's own stuck-recovery eventually writes a terminal status the poll catches,
// so this is just a defensive cap against an unreachable backend draining the battery.
export const FALLBACK_MAX_CONSECUTIVE_ERRORS = 20;

export type WsStatus = "connecting" | "connected" | "reconnecting" | "closed";

export interface AppStateSubscription {
  remove(): void;
}

export interface AppStateLike {
  addEventListener(
    type: "change",
    listener: (state: AppStateStatus) => void,
  ): AppStateSubscription;
}

/** Thrown by an adapter's `fetchOnce` on an HTTP error so the controller can route it. */
export class PollHttpError extends Error {
  constructor(
    readonly status: number,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "PollHttpError";
  }
}

export interface ProgressFallbackOptions<T> {
  /** Fetch the current status row once. Resolves T, or throws PollHttpError / network error. */
  fetchOnce: (signal: AbortSignal) => Promise<T>;
  /** Apply a polled result to the store. Returns true when terminal (stop polling). */
  apply: (result: T) => boolean;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  appState?: AppStateLike;
  now?: () => number;
  rand?: () => number;
}

/** Adaptive, jittered poll delay. Backs off as the job ages, capped, with +/- jitter. */
export function nextPollDelayMs(tick: number, rand: () => number): number {
  const base = Math.min(
    FALLBACK_BASE_INTERVAL_MS * 2 ** Math.min(tick, 3),
    FALLBACK_MAX_INTERVAL_MS,
  );
  const jitter = 1 + (rand() * 2 - 1) * FALLBACK_JITTER_RATIO;
  return Math.max(FALLBACK_BASE_INTERVAL_MS, Math.round(base * jitter));
}

export class ProgressFallback<T> {
  private stopped = false;
  private terminal = false;
  private wsStatus: WsStatus = "connecting";
  private tick = 0;
  private consecutiveErrors = 0;
  private lastWsActivity: number;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private appSub: AppStateSubscription | null = null;

  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly appState: AppStateLike;
  private readonly now: () => number;
  private readonly rand: () => number;

  constructor(private readonly options: ProgressFallbackOptions<T>) {
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.appState = options.appState ?? (AppState as unknown as AppStateLike);
    this.now = options.now ?? (() => Date.now());
    this.rand = options.rand ?? Math.random;
    this.lastWsActivity = this.now();
  }

  start(): void {
    // Idempotent: tear down any prior AppState subscription + pending poll timer
    // before re-arming, so a double-start() (e.g. StrictMode double-invoke or
    // hot-reload on the same instance) cannot leak the previous subscription/timer.
    if (this.pollTimer) {
      this.clearTimer(this.pollTimer);
      this.pollTimer = null;
    }
    this.appSub?.remove();
    this.appSub = null;
    this.stopped = false;
    this.terminal = false;
    this.lastWsActivity = this.now();
    this.appSub = this.appState.addEventListener("change", (state) => {
      if (state === "active") this.reconcileNow();
    });
    this.scheduleNext();
  }

  stop(): void {
    this.stopped = true;
    if (this.pollTimer) {
      this.clearTimer(this.pollTimer);
      this.pollTimer = null;
    }
    this.abort?.abort();
    this.abort = null;
    this.appSub?.remove();
    this.appSub = null;
  }

  /** Feed WS connection-status transitions in. `connected` suppresses polling (WS wins). */
  noteWsStatus(status: WsStatus): void {
    this.wsStatus = status;
    if (status === "connected") this.lastWsActivity = this.now();
  }

  /** Feed any WS message (incl. heartbeats) in to reset the stall watchdog. */
  noteWsActivity(): void {
    this.lastWsActivity = this.now();
  }

  /** One immediate poll, regardless of WS state — catches a terminal reached off-screen. */
  reconcileNow(): void {
    if (this.stopped || this.terminal) return;
    void this.pollOnce(false);
  }

  /** Poll only while the WS cannot be trusted: in distress, or connected-but-silent past stall. */
  private engaged(): boolean {
    if (this.wsStatus === "reconnecting" || this.wsStatus === "closed") return true;
    // connecting or connected: trust the WS unless it has been silent past the stall window.
    return this.now() - this.lastWsActivity > FALLBACK_STALL_MS;
  }

  private scheduleNext(): void {
    if (this.stopped || this.terminal) return;
    const delay = nextPollDelayMs(this.tick, this.rand);
    this.pollTimer = this.setTimer(() => {
      this.pollTimer = null;
      void this.tickPoll();
    }, delay);
  }

  private async tickPoll(): Promise<void> {
    if (this.stopped || this.terminal) return;
    if (this.engaged()) {
      await this.pollOnce(true);
      this.tick += 1;
    } else {
      // WS healthy — stand down and reset cadence so a later distress re-engages fast.
      this.tick = 0;
    }
    this.scheduleNext();
  }

  private async pollOnce(respectWsHealth: boolean): Promise<void> {
    if (this.stopped || this.terminal) return;
    this.abort?.abort();
    const ac = new AbortController();
    this.abort = ac;

    let result: T;
    try {
      result = await this.options.fetchOnce(ac.signal);
    } catch (err) {
      if (ac.signal.aborted) return;
      // 404 => the job is gone; stop quietly. Everything else (401/403/5xx/network)
      // is transient: the next tick refreshes the token / retries. Cap consecutive
      // failures so an unreachable backend cannot poll forever.
      if (err instanceof PollHttpError && err.status === 404) {
        this.terminal = true;
        this.stop();
        return;
      }
      this.consecutiveErrors += 1;
      if (this.consecutiveErrors >= FALLBACK_MAX_CONSECUTIVE_ERRORS) this.stop();
      return;
    }

    // Stale-resolve guard: a fetch that resolves after stop()/teardown (e.g. sign-out
    // reset) must not write back to a reset store.
    if (this.stopped || this.terminal) return;
    this.consecutiveErrors = 0;

    // If the WS recovered while a SCHEDULED poll was in flight, drop the (now stale)
    // snapshot so it cannot regress a phase the healthy WS already advanced. The
    // foreground reconcile passes respectWsHealth=false so it always applies (it exists
    // precisely to catch a terminal reached while backgrounded).
    if (respectWsHealth && !this.engaged()) return;

    const isTerminal = this.options.apply(result);
    if (isTerminal) {
      this.terminal = true;
      this.stop();
    }
  }
}
