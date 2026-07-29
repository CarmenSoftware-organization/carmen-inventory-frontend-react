import { describe, it, expect } from "vitest";
import { STAGE_ROLE } from "@/types/stage-role";
import { isRowLocked, isRowSettled } from "./helpers";

// สถานะจาก backend เป็นรูป approve/reject ส่วนในฟอร์มมีทั้งสองสะกด — ตรรกะล็อก
// ต้องอ่านออกทั้งคู่ ไม่งั้นแถวที่อนุมัติแล้วจะกลายเป็นแก้ได้ทุก stage
const row = (current: string, initial = current) => ({
  current_stage_status: current,
  _initial_stage_status: initial,
});

describe("isRowSettled", () => {
  it("ยังไม่ตัดสิน = ไม่ล็อก", () => {
    expect(isRowSettled("pending", "pending")).toBe(false);
    expect(isRowSettled("", "")).toBe(false);
  });

  it("ตัดสินมาจาก server แล้ว = ล็อก (ทั้งสองสะกด)", () => {
    expect(isRowSettled("approve", "approve")).toBe(true);
    expect(isRowSettled("approved", "approved")).toBe(true);
    expect(isRowSettled("reject", "reject")).toBe(true);
  });

  it("ผู้ใช้เพิ่งกดในหน้านี้ ยังไม่ล็อก — จะได้กดกลับได้", () => {
    expect(isRowSettled("approve", "pending")).toBe(false);
    expect(isRowSettled("reject", "pending")).toBe(false);
  });
});

describe("isRowLocked", () => {
  it("stage purchase แก้แถวที่ approve มาได้ — เป็นผลของ stage ก่อนหน้า", () => {
    expect(isRowLocked(row("approve"), STAGE_ROLE.PURCHASE)).toBe(false);
    expect(isRowLocked(row("approved"), STAGE_ROLE.PURCHASE)).toBe(false);
  });

  it("stage purchase ยังแตะแถวที่ถูก reject มาไม่ได้", () => {
    expect(isRowLocked(row("reject"), STAGE_ROLE.PURCHASE)).toBe(true);
  });

  it("role อื่นล็อกแถวที่ตัดสินมาแล้วตามเดิม", () => {
    expect(isRowLocked(row("approve"), STAGE_ROLE.APPROVE)).toBe(true);
    expect(isRowLocked(row("approve"), STAGE_ROLE.CREATE)).toBe(true);
    expect(isRowLocked(row("approve"), undefined)).toBe(true);
  });

  it("แถวที่ยังรออยู่ ไม่ล็อกทุก role", () => {
    expect(isRowLocked(row("pending"), STAGE_ROLE.APPROVE)).toBe(false);
    expect(isRowLocked(row("pending"), STAGE_ROLE.PURCHASE)).toBe(false);
  });

  it("รายการที่เพิ่งเพิ่ม (ค่าว่าง) ไม่ล็อก", () => {
    expect(isRowLocked({}, STAGE_ROLE.PURCHASE)).toBe(false);
    expect(isRowLocked({}, STAGE_ROLE.CREATE)).toBe(false);
  });
});
