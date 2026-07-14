import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 26 exposes a built-in localStorage stub that requires --localstorage-file
// and overrides the jsdom one. Replace it with a simple in-memory implementation
// so tests that use localStorage work without any Node flags.
function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

Object.defineProperty(globalThis, "localStorage", {
  value: makeMemoryStorage(),
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: makeMemoryStorage(),
  writable: true,
  configurable: true,
});

// Unmount React trees after every test. RTL's auto-cleanup only registers when
// vitest `globals: true`; this project imports test globals explicitly, so we
// wire cleanup here to stop rendered components (e.g. dialogs) leaking across tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Polyfill ResizeObserver for Radix UI components
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver for scroll-triggered reveal animations
// (components/share/reveal.tsx)
globalThis.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
} as unknown as typeof globalThis.IntersectionObserver;

// jsdom does not implement scrollIntoView; form-helpers' scrollToFirstInvalidField
// calls it on validation failure. Stub it so submit-with-errors tests don't throw.
Element.prototype.scrollIntoView = () => {};
