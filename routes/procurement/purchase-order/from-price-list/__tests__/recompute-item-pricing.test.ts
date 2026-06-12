import { describe, it, expect } from "vitest";
import { recomputeItemFromLocations } from "../_components/recompute-item-pricing";
import {
  WIZARD_ITEM_TEMPLATE,
  type FromPriceListSelectedItem,
} from "../from-price-list-form-schema";

function makeItem(
  overrides: Partial<FromPriceListSelectedItem> = {},
): FromPriceListSelectedItem {
  return {
    ...WIZARD_ITEM_TEMPLATE,
    product_id: "p1",
    price: 100,
    tax_rate: 7,
    order_unit_conversion_factor: 1,
    // ค่าระดับ item ตั้งใจให้ "ค้าง" ค่าเก่า (qty 1) เพื่อพิสูจน์ว่า recompute เขียนทับ
    order_qty: 1,
    base_qty: 1,
    sub_total_price: 100,
    net_amount: 100,
    tax_amount: 7,
    total_price: 107,
    locations: [
      { id: "", order_qty: 3, received_qty: 0 },
      { id: "", order_qty: 2, received_qty: 0 },
    ],
    ...overrides,
  } as FromPriceListSelectedItem;
}

describe("recomputeItemFromLocations", () => {
  it("syncs item-level qty/amounts from the sum of locations", () => {
    const result = recomputeItemFromLocations(makeItem());
    // qty = 3 + 2 = 5
    expect(result.order_qty).toBe(5);
    expect(result.base_qty).toBe(5); // factor 1
    expect(result.sub_total_price).toBe(500); // 5 * 100
    expect(result.net_amount).toBe(500);
    expect(result.tax_amount).toBe(35); // 500 * 7%
    expect(result.total_price).toBe(535);
  });

  it("applies the order→base conversion factor to base_qty", () => {
    const result = recomputeItemFromLocations(
      makeItem({ order_unit_conversion_factor: 12 }),
    );
    expect(result.order_qty).toBe(5);
    expect(result.base_qty).toBe(60); // 5 * 12
  });

  it("treats empty/invalid location qty as zero", () => {
    const result = recomputeItemFromLocations(
      makeItem({
        locations: [
          { id: "", order_qty: Number.NaN, received_qty: 0 },
          { id: "", order_qty: 4, received_qty: 0 },
        ],
      }),
    );
    expect(result.order_qty).toBe(4);
    expect(result.sub_total_price).toBe(400);
  });
});
