import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Node.js 22+ provides a built-in localStorage via --localstorage-file that can
// shadow JSDOM's Storage implementation with a broken stub (missing .clear, etc.).
// Polyfill a complete in-memory Storage when the environment's version is broken.
if (
  typeof window !== "undefined" &&
  typeof window.localStorage.clear !== "function"
) {
  function createStorage(): Storage {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
    };
  }

  Object.defineProperty(window, "localStorage", {
    value: createStorage(),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: createStorage(),
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Recharts' ResponsiveContainer observes its parent via ResizeObserver, which
// jsdom does not implement. A no-op polyfill keeps chart components from
// crashing in unit tests (the SVG renders at 0x0; assertions target the custom
// HTML legend, which renders regardless of chart dimensions).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
