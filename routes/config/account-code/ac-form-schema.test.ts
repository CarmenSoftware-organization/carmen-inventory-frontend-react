import { describe, it, expect } from "vitest";
import { createAcSchema } from "./ac-form-schema";
import { ACCOUNT_CODE_TYPE, ACCOUNT_NATURE } from "@/types/account-code";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;
const schema = createAcSchema(tv, tf);

/** ใบที่กรอกครบตามสัญญาใหม่ของ backend */
const valid = {
  code: "1140-001",
  description_1: "Inventory - Food",
  nature: ACCOUNT_NATURE.DEBIT,
  type: ACCOUNT_CODE_TYPE.BALANCE_SHEET,
  is_active: true,
};

describe("createAcSchema", () => {
  it("ผ่านเมื่อกรอกครบทั้งสี่ช่อง", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("code กับ description_1 ว่างไม่ได้", () => {
    expect(schema.safeParse({ ...valid, code: "" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, description_1: "" }).success).toBe(
      false,
    );
  });

  it("รับ nature แค่ debit กับ credit", () => {
    for (const nature of ["debit", "credit"]) {
      expect(schema.safeParse({ ...valid, nature }).success).toBe(true);
    }
    // ตัวใหญ่ก็ไม่รับ — backend เก็บเป็นตัวเล็ก ส่งตัวใหญ่ไปได้ 400
    for (const nature of ["Debit", "dr", "", "asset"]) {
      expect(schema.safeParse({ ...valid, nature }).success).toBe(false);
    }
  });

  it("รับ type แค่สี่ค่าในผังบัญชี", () => {
    for (const type of [
      "header",
      "balance_sheet",
      "income_statement",
      "statistic",
    ]) {
      expect(schema.safeParse({ ...valid, type }).success).toBe(true);
    }
    for (const type of ["Balance_Sheet", "balance sheet", "", "pl"]) {
      expect(schema.safeParse({ ...valid, type }).success).toBe(false);
    }
  });

  it("ไม่มี name/description เดิมหลงเหลืออยู่ในผลลัพธ์", () => {
    const parsed = schema.parse({
      ...valid,
      name: "ของเก่า",
      description: "ของเก่า",
    });
    expect(parsed).toEqual(valid);
  });
});
