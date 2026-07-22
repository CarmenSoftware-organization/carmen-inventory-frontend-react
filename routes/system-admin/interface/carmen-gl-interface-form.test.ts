import { describe, it, expect } from "vitest";
import {
  carmenGlSchema,
  toFormValues,
  toApiValue,
  EMPTY_CARMEN_GL,
} from "./carmen-gl-interface-form";

describe("carmenGlSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = carmenGlSchema.safeParse({
      enabled: true,
      api_server: "https://dev.carmen4.com/carmen.api/",
      authorize_token: "tok",
      account_code_path: "api/interface/accountCode",
      department_path: "api/interface/department",
      vendor_path: "api/interface/vendor",
      set_account_mapping_all_items: true,
      allow_posting_transfer_to_gl: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-boolean option toggle", () => {
    const parsed = carmenGlSchema.safeParse({
      ...EMPTY_CARMEN_GL,
      allow_posting_transfer_to_gl: "yes",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_CARMEN_GL);
  });

  it("prefills the three endpoint paths with the legacy defaults", () => {
    const values = toFormValues({ enabled: true });
    expect(values.account_code_path).toBe("api/interface/accountCode");
    expect(values.department_path).toBe("api/interface/department");
    expect(values.vendor_path).toBe("api/interface/vendor");
  });

  it("parses an old generic-accounting row to defaults (lazy schema evolution)", () => {
    const values = toFormValues({
      enabled: true,
      default_account_code: "1000",
      default_department_code: "D1",
      default_invoice_value: "0",
      export_format: "csv",
      endpoint: "https://gl.example.com",
      posting_frequency: "daily",
    });
    expect(values).toEqual({ ...EMPTY_CARMEN_GL, enabled: true });
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      api_server: "https://dev.carmen4.com/carmen.api/",
      authorize_token: "tok",
      account_code_path: "api/x",
      department_path: "api/y",
      vendor_path: "api/z",
      set_account_mapping_all_items: false,
      allow_posting_transfer_to_gl: true,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
