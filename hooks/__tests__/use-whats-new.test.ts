import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/changelog", () => ({
  CURRENT_VERSION: "2.0.0",
  LATEST: {
    changes: {
      added: [{ scope: null, summary: "x", hash: "h", author: "a", pr: null }],
      fixed: [],
      changed: [],
    },
  },
}));

import { useWhatsNew } from "@/hooks/use-whats-new";

const KEY = "carmen.whatsNew.lastSeen";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useWhatsNew", () => {
  it("does not auto-open on first-ever load and sets the baseline", () => {
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(false);
    expect(localStorage.getItem(KEY)).toBe("2.0.0");
  });

  it("auto-opens when stored version differs and there are changes", () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(true);
  });

  it("does not auto-open when stored version matches current", () => {
    localStorage.setItem(KEY, "2.0.0");
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(false);
  });

  it("markSeen writes the current version and clears the flag", () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(true);
    act(() => result.current.markSeen());
    expect(localStorage.getItem(KEY)).toBe("2.0.0");
    expect(result.current.shouldAutoOpen).toBe(false);
  });
});
