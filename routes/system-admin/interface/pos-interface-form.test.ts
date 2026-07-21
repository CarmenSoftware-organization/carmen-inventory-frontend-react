import { describe, it, expect } from "vitest";
import {
  posSchema,
  toFormValues,
  toApiValue,
  EMPTY_POS,
} from "./pos-interface-form";

describe("posSchema", () => {
  it("accepts a fully populated value", () => {
    const parsed = posSchema.safeParse({
      enabled: true,
      endpoint: "https://pos.example.com",
      api_key: "k",
      sync_frequency: "daily",
      default_location_code: "L1",
      consumption_posting: "recipe",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown sync frequency", () => {
    const parsed = posSchema.safeParse({
      ...EMPTY_POS,
      sync_frequency: "monthly",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown consumption posting", () => {
    const parsed = posSchema.safeParse({
      ...EMPTY_POS,
      consumption_posting: "average",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toFormValues / toApiValue", () => {
  it("falls back to defaults when the config has never been saved", () => {
    expect(toFormValues(undefined)).toEqual(EMPTY_POS);
  });

  it("keeps the masked api_key so an untouched form posts it back unchanged", () => {
    const values = toFormValues({
      enabled: true,
      endpoint: "e",
      api_key: "***ENCRYPTED***",
      sync_frequency: "daily",
      default_location_code: "L1",
      consumption_posting: "recipe",
    });
    expect(values.api_key).toBe("***ENCRYPTED***");
  });

  it("round-trips a full value unchanged", () => {
    const values = {
      enabled: true,
      endpoint: "https://x.example.com",
      api_key: "k",
      sync_frequency: "hourly" as const,
      default_location_code: "L2",
      consumption_posting: "direct" as const,
    };
    expect(toFormValues(toApiValue(values))).toEqual(values);
  });
});
