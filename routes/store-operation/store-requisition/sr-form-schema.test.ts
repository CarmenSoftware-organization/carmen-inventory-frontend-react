import { describe, it, expect } from "vitest";
import { computeSrAction } from "./sr-form-schema";

/**
 * `computeSrAction` เป็นตัวตัดสินว่าปุ่มไหนโผล่ท้ายฟอร์ม (ดู `SrFooter`) —
 * ตัดสินผิดคือคนอนุมัติเห็นปุ่มผิดตัว หรือไม่เห็นปุ่มเลยทั้งที่ติ๊กแถวไว้แล้ว
 */
describe("computeSrAction", () => {
  it("ยังไม่ติ๊กอะไรเลย = ไม่มีปุ่ม", () => {
    expect(computeSrAction([])).toBe("none");
    expect(computeSrAction(["", "", ""])).toBe("none");
  });

  it("แถวที่ยังเป็น pending ไม่นับเป็นการตัดสิน", () => {
    expect(computeSrAction(["pending", "pending"])).toBe("none");
  });

  it("มีสักแถวสั่งส่งกลับ = ทั้งใบเป็นส่งกลับ (ชนะทุกสถานะ)", () => {
    expect(computeSrAction(["approve", "review", "reject"])).toBe("review");
    expect(computeSrAction(["review"])).toBe("review");
  });

  it("ปฏิเสธยกใบถึงจะเป็นปฏิเสธ", () => {
    expect(computeSrAction(["reject", "reject"])).toBe("rejected");
  });

  it("อนุมัติปนปฏิเสธ = อนุมัติ (ใบยังเดินต่อ)", () => {
    expect(computeSrAction(["approve", "reject"])).toBe("approved");
    expect(computeSrAction(["approve"])).toBe("approved");
  });

  it("ตัดสินไม่ครบทุกแถว = ยังไม่มีปุ่มให้กด", () => {
    expect(computeSrAction(["approve", "pending"])).toBe("none");
    expect(computeSrAction(["reject", "pending"])).toBe("none");
  });

  it("ค่าว่างในลิสต์ไม่ทำให้ผลเพี้ยน — แถวที่ยังไม่แตะถูกกรองทิ้งก่อน", () => {
    expect(computeSrAction(["", "approve", ""])).toBe("approved");
    expect(computeSrAction(["", "reject"])).toBe("rejected");
  });
});
