import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useQuantityFormatter } from "./use-number-formatter";

// BU config มีแต่ locales กับ minimumIntegerDigits — ตัวหลังคือ "หลักหน้าจุด"
// ของ Intl ไม่ใช่ทศนิยม ตั้งค่าไว้เยอะ ๆ เพื่อพิสูจน์ว่าไม่มีใครไปอ่านมันแล้ว
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    defaultBu: {
      config: { quantity_format: { locales: "en-US", minimumIntegerDigits: 3 } },
    },
  }),
}));

const format = (decimals?: number) =>
  renderHook(() => useQuantityFormatter(decimals)).result.current;

describe("useQuantityFormatter — ทศนิยมมาจากหน่วย ไม่ใช่ config ของ BU", () => {
  it("หน่วยที่ decimal_place = 2 → สองตำแหน่งตายตัว", () => {
    const f = format(2);
    expect(f(2)).toBe("2.00");
    expect(f(2.5)).toBe("2.50");
  });

  it("หน่วยนับชิ้น (0) → ไม่มีจุดทศนิยมเลย", () => {
    expect(format(0)(2)).toBe("2");
  });

  it("หน่วยที่ละเอียดกว่า (3) → สามตำแหน่ง", () => {
    expect(format(3)(2.5)).toBe("2.500");
  });

  it("ไม่ส่ง decimals → 2 (DEFAULT_QTY_DECIMALS) ไม่ใช่ 3 จาก minimumIntegerDigits", () => {
    expect(format()(2.5)).toBe("2.50");
  });

  it("null/NaN → ค่าว่าง ไม่ใช่ 0 หรือ NaN", () => {
    const f = format(2);
    expect(f(null)).toBe("");
    expect(f(undefined)).toBe("");
    expect(f(Number.NaN)).toBe("");
  });

  it("หลักพันยังมีคอมม่าตาม locale", () => {
    expect(format(2)(1234.5)).toBe("1,234.50");
  });
});
