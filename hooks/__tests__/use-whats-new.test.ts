import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_RELEASE } from "@/lib/version";

// useWhatsNew() เช็ค "เห็น version นี้หรือยัง" ด้วย APP_RELEASE (ฉีดตอน build จาก
// changelog.json) ไม่ต้อง import lib/changelog.ts — mock นี้จึงเหลือแค่ LATEST
// ที่ hook ยัง dynamic-import ตอน version เปลี่ยนจริง
vi.mock("@/lib/changelog", () => ({
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
  it("does not auto-open on first-ever load and sets the baseline", async () => {
    const { result } = renderHook(() => useWhatsNew());
    // hook ตัดสินใจแบบ async (dynamic import) — ต้องปล่อยให้ microtask
    // ทั้งหมดวิ่งจบก่อน ไม่งั้น assert false ตรงนี้จะจริงเสมอไม่ว่า hook
    // จะทำอะไร (เคย regress มาแล้วตอน hook เปลี่ยนเป็น async)
    await act(async () => {});
    expect(result.current.shouldAutoOpen).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(APP_RELEASE);
  });

  it("auto-opens when stored version differs and there are changes", async () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    // เส้นนี้ dynamic-import lib/changelog.ts ก่อนตัดสินใจ — ต้องรอ microtask
    await waitFor(() => expect(result.current.shouldAutoOpen).toBe(true));
  });

  it("does not auto-open when stored version matches current", async () => {
    localStorage.setItem(KEY, APP_RELEASE);
    const { result } = renderHook(() => useWhatsNew());
    // เหตุผลเดียวกับเคสแรก — ต้องรอ decision แบบ async ให้จบก่อน assert
    await act(async () => {});
    expect(result.current.shouldAutoOpen).toBe(false);
  });

  it("markSeen writes the current version and clears the flag", async () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    await waitFor(() => expect(result.current.shouldAutoOpen).toBe(true));
    act(() => result.current.markSeen());
    expect(localStorage.getItem(KEY)).toBe(APP_RELEASE);
    expect(result.current.shouldAutoOpen).toBe(false);
  });
});
