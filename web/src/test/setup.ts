import "@testing-library/jest-dom/vitest";

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
