import { describe, it, expect } from "vitest";
import { buildPayload } from "./pd-form";
import type { ProductFormValues } from "@/types/product";

const values: ProductFormValues = {
  name: "Espresso",
  code: "P001",
  local_name: "เอสเพรสโซ",
  description: "",
  inventory_unit_id: "u1",
  product_category_id: "",
  product_sub_category_id: "",
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
    const payload = buildPayload(values, undefined, true);
    expect(payload.code).toBeUndefined();
  });

  it("keeps the existing code on update (isAdd=false)", () => {
    const payload = buildPayload(values, undefined, false);
    expect(payload.code).toBe("P001");
  });
});

// หลังบ้านระบุแถวที่ลบ/แก้ด้วยคีย์ของมันเอง ไม่ใช่ id ของแถว — ส่ง { id } ไป zod ตอบ 400 ทั้งคำขอ
// (ลบคลังออกจากสินค้า หรือแก้/ลบหน่วยส่วนผสม แล้วบันทึกสินค้าทั้งตัวไม่ได้เลย)
describe("buildPayload — rows the backend keys by its own ids", () => {
  const product = {
    locations: [
      { id: "pl-1", location: { id: "loc-1", code: "L1", name: "Main" } },
      { id: "pl-2", location: { id: "loc-2", code: "L2", name: "Bar" } },
    ],
    order_units: [],
    ingredient_units: [
      {
        id: "iu-1",
        from_unit: { id: "u-kg" },
        from_unit_qty: 1,
        to_unit: { id: "u-g" },
        to_unit_qty: 1000,
        description: "",
        is_default: false,
        is_active: true,
      },
      {
        id: "iu-2",
        from_unit: { id: "u-l" },
        from_unit_qty: 1,
        to_unit: { id: "u-ml" },
        to_unit_qty: 1000,
        description: "",
        is_default: false,
        is_active: true,
      },
    ],
  } as unknown as Parameters<typeof buildPayload>[1];

  const baseRows = {
    locations: [
      {
        id: "pl-1",
        location_id: "loc-1",
        location_code: "L1",
        location_name: "Main",
        location_type: null,
        is_active: null,
        shelf_id: null,
        delivery_point_id: null,
        delivery_point: null,
        min_qty: null,
        max_qty: null,
        re_order_qty: null,
        par_qty: null,
      },
    ],
  };

  it("removes a location by its location_id, not the product-location row id", () => {
    const payload = buildPayload({ ...values, ...baseRows }, product, false);
    expect(payload.locations?.remove).toEqual([{ location_id: "loc-2" }]);
  });

  it("updates and removes ingredient units by product_ingredient_unit_id", () => {
    const payload = buildPayload(
      {
        ...values,
        ...baseRows,
        ingredient_units: [
          {
            id: "iu-1",
            from_unit_id: "u-kg",
            from_unit_qty: 1,
            to_unit_id: "u-g",
            to_unit_qty: 500,
            description: "",
            is_default: false,
            is_active: true,
          },
        ],
      },
      product,
      false,
    );
    expect(payload.ingredient_units?.update).toEqual([
      expect.objectContaining({ product_ingredient_unit_id: "iu-1", to_unit_qty: 500 }),
    ]);
    expect(payload.ingredient_units?.update?.[0]).not.toHaveProperty("id");
    expect(payload.ingredient_units?.remove).toEqual([
      { product_ingredient_unit_id: "iu-2" },
    ]);
  });
});
