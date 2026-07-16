import { describe, it, expect } from "vitest";
import {
  pmsSchema,
  toFormValues,
  toApiValue,
  EMPTY_PMS,
} from "./pms-interface-form";

describe("pmsSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = pmsSchema.safeParse({
      enabled: true,
      endpoint: "https://pms.example.com",
      api_key: "k",
      property_code: "P1",
      post_city_ledger: true,
      post_credit_card: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-boolean posting toggle", () => {
    const parsed = pmsSchema.safeParse({
      ...EMPTY_PMS,
      post_city_ledger: "yes",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_PMS);
  });

  it("defaults both posting toggles off for a bare stored value", () => {
    const values = toFormValues({ enabled: true });
    expect(values.post_city_ledger).toBe(false);
    expect(values.post_credit_card).toBe(false);
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      endpoint: "https://x.example.com",
      api_key: "k",
      property_code: "P9",
      post_city_ledger: true,
      post_credit_card: true,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
