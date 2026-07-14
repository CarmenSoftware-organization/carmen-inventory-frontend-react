import { describe, it, expect } from "vitest";
import { buildPayload } from "./pd-form";
import type { ProductFormValues } from "@/types/product";

const values: ProductFormValues = {
  name: "Espresso",
  code: "P001",
  local_name: "เอสเพรสโซ",
  description: "",
  inventory_unit_id: "u1",
  product_item_group_id: "ig1",
  product_status_type: "active",
  tax_profile_id: "",
  is_used_in_recipe: false,
  is_sold_directly: false,
  barcode: "",
  sku: "",
  price: 10,
  price_deviation_limit: 0,
  qty_deviation_limit: 0,
  info: [],
  locations: [],
  order_units: [],
  ingredient_units: [],
};

describe("buildPayload — auto-generated code", () => {
  it("omits code on create (isAdd=true)", () => {
    const payload = buildPayload(values, undefined, {}, true);
    expect(payload.code).toBeUndefined();
  });

  it("keeps the existing code on update (isAdd=false)", () => {
    const payload = buildPayload(values, undefined, {}, false);
    expect(payload.code).toBe("P001");
  });
});
