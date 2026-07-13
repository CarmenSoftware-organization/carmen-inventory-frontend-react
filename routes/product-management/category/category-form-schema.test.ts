import { describe, it, expect } from "vitest";
import {
  categorySchema,
  stripAutoCode,
  type CategoryFormValues,
} from "./category-form-schema";

const baseValues: CategoryFormValues = {
  code: "",
  name: "Beverage",
  description: "",
  is_active: true,
  cascade_deviation: true,
  price_deviation_limit: 0,
  qty_deviation_limit: 0,
  is_used_in_recipe: false,
  is_sold_directly: false,
  tax_profile_id: "tax-1",
  tax_rate: 0,
};

describe("categorySchema — code is optional (server-assigned)", () => {
  it("parses successfully with an empty code (add mode)", () => {
    const result = categorySchema.safeParse(baseValues);
    expect(result.success).toBe(true);
  });

  it("parses successfully with no code key at all", () => {
    const { code: _code, ...withoutCode } = baseValues;
    const result = categorySchema.safeParse(withoutCode);
    expect(result.success).toBe(true);
  });
});

describe("stripAutoCode", () => {
  it("removes code in add mode so the server assigns it", () => {
    const payload = stripAutoCode("add", { ...baseValues, code: "typed" });
    expect(payload.code).toBeUndefined();
    expect(payload.name).toBe("Beverage");
  });

  it("keeps code unchanged in edit mode", () => {
    const payload = stripAutoCode("edit", { ...baseValues, code: "C01" });
    expect(payload.code).toBe("C01");
  });
});
