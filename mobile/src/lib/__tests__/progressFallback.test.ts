import {
  ProgressFallback,
  PollHttpError,
  nextPollDelayMs,
  FALLBACK_MAX_CONSECUTIVE_ERRORS,
  type AppStateLike,
  type ProgressFallbackOptions,
} from "../progressFallback";

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

interface Harness {
  setTimer: typeof setTimeout;
  clearTimer: typeof clearTimeout;
  now: () => number;
  advance: (ms: number) => void;
  appState: AppStateLike;
  fireForeground: () => void;
  runNextTimer: () => Promise<void>;
  pending: () => number;
}

function makeHarness(): Harness {
  const timers: Array<() => void> = [];
  let nowMs = 100000;
  let listener: ((s: string) => void) | null = null;
  const setTimer = ((cb: () => void) => {
    timers.push(cb);
    return timers.length as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  return {
    setTimer,
    clearTimer: (() => {}) as typeof clearTimeout,
    now: () => nowMs,
    advance: (ms) => {
      nowMs += ms;
    },
    appState: {
      addEventListener: (_t, l) => {
        listener = l as (s: string) => void;
        return {
          remove: () => {
            listener = null;
          },
        };
      },
    },
    fireForeground: () => listener?.("active"),
    runNextTimer: async () => {
      const cb = timers.shift();
      cb?.();
      await flush();
    },
    pending: () => timers.length,
  };
}

function makeFallback<T>(
  h: Harness,
  opts: Pick<ProgressFallbackOptions<T>, "fetchOnce" | "apply">,
): ProgressFallback<T> {
  return new ProgressFallback<T>({
    ...opts,
    setTimer: h.setTimer,
    clearTimer: h.clearTimer,
    now: h.now,
    appState: h.appState,
    rand: () => 0.5, // no jitter
  });
}

describe("nextPollDelayMs", () => {
  it("backs off adaptively and caps", () => {
    const noJitter = () => 0.5;
    expect(nextPollDelayMs(0, noJitter)).toBe(2500);
    expect(nextPollDelayMs(1, noJitter)).toBe(5000);
    expect(nextPollDelayMs(2, noJitter)).toBe(10000);
    expect(nextPollDelayMs(3, noJitter)).toBe(15000); // 20000 capped to 15000
    expect(nextPollDelayMs(9, noJitter)).toBe(15000);
  });

  it("never returns below the base interval even with min jitter", () => {
    expect(nextPollDelayMs(0, () => 0)).toBeGreaterThanOrEqual(2500);
  });
});

describe("ProgressFallback engagement", () => {
  it("polls while the WS is in distress (reconnecting)", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockResolvedValue({ ok: true });
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    await h.runNextTimer();
    expect(fetchOnce).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
    fb.stop();
  });

  it("stands down (no poll) while the WS is connected", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockResolvedValue({ ok: true });
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("connected");
    await h.runNextTimer();
    expect(fetchOnce).not.toHaveBeenCalled();
    fb.stop();
  });

  it("engages when a connected WS goes silent past the stall window", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockResolvedValue({ ok: true });
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("connected");
    h.advance(41000); // > FALLBACK_STALL_MS (40000)
    await h.runNextTimer();
    expect(fetchOnce).toHaveBeenCalledTimes(1);
    fb.stop();
  });
});

describe("ProgressFallback termination + guards", () => {
  it("latches terminal and stops scheduling once apply returns true", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockResolvedValue({ done: true });
    const apply = jest.fn().mockReturnValue(true);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    await h.runNextTimer();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(h.pending()).toBe(0); // no further poll scheduled after terminal
  });

  it("drops a fetch that resolves after stop() (stale-resolve / sign-out race)", async () => {
    const h = makeHarness();
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchOnce = jest.fn(
      () => new Promise((res) => {
        resolveFetch = res;
      }),
    );
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    await h.runNextTimer(); // poll in-flight (fetch pending)
    expect(fetchOnce).toHaveBeenCalledTimes(1);
    fb.stop();
    resolveFetch({ late: true });
    await flush();
    expect(apply).not.toHaveBeenCalled();
  });

  it("stops quietly on a 404 (job gone) without applying", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockRejectedValue(new PollHttpError(404));
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    await h.runNextTimer();
    expect(apply).not.toHaveBeenCalled();
    expect(h.pending()).toBe(0);
  });

  it("treats auth/network errors as transient and caps consecutive failures", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockRejectedValue(new PollHttpError(401));
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    for (let i = 0; i < FALLBACK_MAX_CONSECUTIVE_ERRORS; i += 1) {
      await h.runNextTimer();
    }
    expect(fetchOnce).toHaveBeenCalledTimes(FALLBACK_MAX_CONSECUTIVE_ERRORS);
    expect(h.pending()).toBe(0); // capped -> stopped
    expect(apply).not.toHaveBeenCalled();
  });

  it("reconciles immediately on app-foreground even when the WS is connected", async () => {
    const h = makeHarness();
    const fetchOnce = jest.fn().mockResolvedValue({ ok: true });
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("connected"); // suppressed for scheduled polls...
    h.fireForeground(); // ...but foreground reconcile fires regardless
    await flush();
    expect(fetchOnce).toHaveBeenCalledTimes(1);
    fb.stop();
  });

  it("drops a SCHEDULED poll result if the WS recovers mid-fetch (no phase regression)", async () => {
    const h = makeHarness();
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchOnce = jest.fn(
      () => new Promise((res) => {
        resolveFetch = res;
      }),
    );
    const apply = jest.fn().mockReturnValue(false);
    const fb = makeFallback(h, { fetchOnce, apply });
    fb.start();
    fb.noteWsStatus("reconnecting");
    await h.runNextTimer(); // scheduled poll now in-flight
    expect(fetchOnce).toHaveBeenCalledTimes(1);
    fb.noteWsStatus("connected"); // WS recovers during the fetch
    resolveFetch({ stale: true });
    await flush();
    expect(apply).not.toHaveBeenCalled(); // stale scheduled snapshot dropped (WS wins)
    fb.stop();
  });

  it("removes its AppState listener on stop (no leak)", () => {
    const h = makeHarness();
    const removeSpy = jest.fn();
    const appState: AppStateLike = {
      addEventListener: () => ({ remove: removeSpy }),
    };
    const fb = new ProgressFallback<unknown>({
      fetchOnce: jest.fn().mockResolvedValue({}),
      apply: jest.fn().mockReturnValue(false),
      setTimer: h.setTimer,
      clearTimer: h.clearTimer,
      now: h.now,
      appState,
    });
    fb.start();
    fb.stop();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a double start() removes the prior AppState listener (no leak, P38)", () => {
    let live = 0;
    const clearSpy = jest.fn();
    const removeSpy = jest.fn(() => {
      live -= 1;
    });
    const appState: AppStateLike = {
      addEventListener: () => {
        live += 1;
        return { remove: removeSpy };
      },
    };
    const fb = new ProgressFallback<unknown>({
      fetchOnce: jest.fn().mockResolvedValue({}),
      apply: jest.fn().mockReturnValue(false),
      setTimer: ((cb: () => void) => {
        void cb;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimer: clearSpy as unknown as typeof clearTimeout,
      now: () => 100000,
      appState,
    });
    fb.start();
    fb.start(); // double-start without an intervening stop()
    expect(removeSpy).toHaveBeenCalledTimes(1); // prior subscription torn down
    expect(live).toBe(1); // exactly one live AppState listener (no leak)
    expect(clearSpy).toHaveBeenCalledTimes(1); // prior pending poll timer cancelled (not stacked)
    fb.stop();
    expect(live).toBe(0); // fully cleaned up
  });
});
