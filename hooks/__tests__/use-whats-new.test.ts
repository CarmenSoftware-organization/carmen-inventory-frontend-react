import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "@/lib/version";

// เดี๋ยวนี้ useWhatsNew() ใช้ APP_VERSION (จาก package.json, ฉีดตอน build) แทน
// CURRENT_VERSION ของ lib/changelog.ts สำหรับเช็ค "เห็น version นี้หรือยัง" —
// ทั้งสองค่าเท่ากันเสมอเพราะ build:bump เขียนคู่กัน (ดู docblock ของ hook) mock
// นี้จึงเหลือแค่ LATEST ที่ hook ยัง dynamic-import ตอน version เปลี่ยนจริง
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
  it("does not auto-open on first-ever load and sets the baseline", () => {
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(APP_VERSION);
  });

  it("auto-opens when stored version differs and there are changes", async () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    // เส้นนี้ dynamic-import lib/changelog.ts ก่อนตัดสินใจ — ต้องรอ microtask
    await waitFor(() => expect(result.current.shouldAutoOpen).toBe(true));
  });

  it("does not auto-open when stored version matches current", () => {
    localStorage.setItem(KEY, APP_VERSION);
    const { result } = renderHook(() => useWhatsNew());
    expect(result.current.shouldAutoOpen).toBe(false);
  });

  it("markSeen writes the current version and clears the flag", async () => {
    localStorage.setItem(KEY, "1.0.0");
    const { result } = renderHook(() => useWhatsNew());
    await waitFor(() => expect(result.current.shouldAutoOpen).toBe(true));
    act(() => result.current.markSeen());
    expect(localStorage.getItem(KEY)).toBe(APP_VERSION);
    expect(result.current.shouldAutoOpen).toBe(false);
  });
});
