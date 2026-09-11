import { describe, it, expect } from "vitest";
import { canDeletePr } from "./pr-ownership";

const ME = "user-1";
const SOMEONE_ELSE = "user-2";

describe("canDeletePr", () => {
  it("เจ้าของใบลบได้", () => {
    expect(canDeletePr({ requestor_id: ME }, ME, false)).toBe(true);
  });

  it("ใบของคนอื่นลบไม่ได้", () => {
    expect(canDeletePr({ requestor_id: SOMEONE_ELSE }, ME, false)).toBe(false);
  });

  it("admin ลบใบของคนอื่นได้", () => {
    expect(canDeletePr({ requestor_id: SOMEONE_ELSE }, ME, true)).toBe(true);
  });

  it("payload ไม่มี requestor_id → ไม่บล็อก ปล่อยให้ backend ตัดสิน", () => {
    expect(canDeletePr({ requestor_id: "" }, ME, false)).toBe(true);
    expect(canDeletePr(null, ME, false)).toBe(true);
    expect(canDeletePr(undefined, ME, false)).toBe(true);
  });

  it("ยังไม่รู้ว่าเราเป็นใคร (profile ยังไม่โหลด) → ไม่บล็อก", () => {
    expect(canDeletePr({ requestor_id: SOMEONE_ELSE }, undefined, false)).toBe(
      true,
    );
  });
});
