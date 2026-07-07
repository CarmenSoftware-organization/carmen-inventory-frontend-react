import { describe, it, expect } from "vitest";
import type { BusinessUnitDetail } from "@/types/business-unit";
import { toFormValues, buildPatch } from "./business-setting-form-schema";

/** minimal detail สำหรับ test — ค่าที่ไม่เกี่ยวใส่ null/ค่าว่างพอผ่าน type */
const baseData: BusinessUnitDetail = {
  id: "bu-1",
  cluster_id: "cl-1",
  code: "PP01",
  name: "PP @ PP",
  alias_name: "PP",
  description: null,
  info: null,
  is_hq: true,
  is_active: true,
  db_connection: null,
  config: {},
  default_currency_id: "cur-1",
  calculation_method: "average",
  max_license_users: 3,
  branch_no: null,
  company_name: null,
  company_address: null,
  company_email: null,
  company_tel: null,
  company_zip_code: null,
  tax_no: null,
  hotel_name: null,
  hotel_address: null,
  hotel_email: null,
  hotel_tel: null,
  hotel_zip_code: null,
  date_format: "yyyy-MM-dd",
  date_time_format: "yyyy-MM-dd HH:mm:ss",
  time_format: "HH:mm:ss",
  short_time_format: "HH:mm",
  long_time_format: "HH:mm:ss",
  timezone: "Asia/Bangkok",
  amount_format: { locales: "th-TH", minimumIntegerDigits: 2 },
  quantity_format: { locales: "th-TH", minimumIntegerDigits: 2 },
  perpage_format: { locales: "th-TH", minimumIntegerDigits: 2 },
  recipe_format: { locales: "th-TH", minimumIntegerDigits: 2 },
  doc_version: 1,
  cluster_name: "ZEBRA",
  logo: null,
  avatar: null,
  audit: null,
};

describe("buildPatch", () => {
  it("ส่งเฉพาะ field ที่แก้ (name + company_name)", () => {
    const original = toFormValues(baseData);
    const values = {
      ...original,
      name: "New name",
      company_name: "ACME",
    };
    expect(buildPatch(values, original)).toEqual({
      name: "New name",
      company_name: "ACME",
    });
  });

  it("costing method / max license users ไม่อยู่ในฟอร์ม จึงไม่มีทางถูกส่ง (read-only)", () => {
    const values = toFormValues(baseData) as Record<string, unknown>;
    expect(values.calculation_method).toBeUndefined();
    expect(values.max_license_users).toBeUndefined();
  });

  it("คืน patch ว่างเมื่อไม่มีอะไรเปลี่ยน", () => {
    const original = toFormValues(baseData);
    expect(buildPatch({ ...original }, original)).toEqual({});
  });

  it("แปลง text field ว่างกลับเป็น null", () => {
    const original = toFormValues(baseData);
    const values = { ...original, alias_name: "" };
    expect(buildPatch(values, original)).toEqual({ alias_name: null });
  });

  it("ส่งทั้ง object เมื่อ number-format เปลี่ยนส่วนใดส่วนหนึ่ง", () => {
    const original = toFormValues(baseData);
    const values = {
      ...original,
      amount_format: { locales: "en-US", minimumIntegerDigits: 2 },
    };
    expect(buildPatch(values, original)).toEqual({
      amount_format: { locales: "en-US", minimumIntegerDigits: 2 },
    });
  });

  it("ส่งค่า boolean (is_active) เมื่อเปลี่ยน", () => {
    const original = toFormValues(baseData);
    const values = { ...original, is_active: false };
    expect(buildPatch(values, original)).toEqual({ is_active: false });
  });
});
