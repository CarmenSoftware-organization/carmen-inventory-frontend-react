import { describe, expect, it } from "vitest";
import { grnCurrencyId } from "./cn-grn-currency";

const THB = "8e293810-1c5b-4c16-91db-05d6b330a60b";

describe("grnCurrencyId", () => {
  it("อ่านจาก object currency.id (list/detail ที่ collapse แล้ว)", () => {
    expect(grnCurrencyId({ currency: { id: THB, code: "THB" } })).toBe(THB);
  });

  // แถวจริงจาก GET vendor/:vendor_id/cn บน staging (2026-09-29): ไม่มี currency ส่งมาแค่ currency_id แบน
  it("อ่านจาก currency_id แบบแบนเมื่อไม่มี object", () => {
    expect(grnCurrencyId({ currency: undefined as never, currency_id: THB })).toBe(THB);
  });

  it("ถ้ามีทั้งสองรูป ยึด object ก่อน", () => {
    expect(grnCurrencyId({ currency: { id: THB, code: "THB" }, currency_id: "other" })).toBe(THB);
  });

  it("ไม่มีทั้งสองรูป → ค่าว่าง", () => {
    expect(grnCurrencyId({ currency: null, currency_id: null })).toBe("");
  });
});
