import { describe, it, expect } from "vitest";
import {
  accountingSchema,
  toFormValues,
  toApiValue,
  EMPTY_ACCOUNTING,
} from "./accounting-interface-form";

describe("accountingSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = accountingSchema.safeParse({
      enabled: true,
      system: "carmen_gl",
      default_account_code: "1000",
      default_department_code: "D1",
      default_invoice_value: "0",
      export_format: "csv",
      endpoint: "https://gl.example.com",
      posting_frequency: "daily",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown accounting system", () => {
    const parsed = accountingSchema.safeParse({
      ...EMPTY_ACCOUNTING,
      system: "sap",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_ACCOUNTING);
  });

  it("fills defaults for keys the stored value omits", () => {
    expect(toFormValues({ enabled: true })).toEqual({
      ...EMPTY_ACCOUNTING,
      enabled: true,
    });
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      system: "blueledgers" as const,
      default_account_code: "2000",
      default_department_code: "D2",
      default_invoice_value: "100",
      export_format: "xml" as const,
      endpoint: "https://x.example.com",
      posting_frequency: "monthly" as const,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
