import { describe, it, expect } from "vitest";
import { expandItemPerLocation } from "./expand-item-per-location";
import type { FromPriceListSelectedItem } from "./from-price-list-form-schema";

/**
 * เดิมฟังก์ชันนี้ชื่อ `recomputeItemFromLocations` และ **บวก** qty ทุกคลังรวมเป็น
 * แถวเดียว ตอนนี้ PO นับแถวละคลัง มันจึงกางออกแทน
 */
const item = (v: Partial<FromPriceListSelectedItem>) =>
  ({
    price: 100,
    tax_rate: 0,
    order_unit_conversion_factor: 1,
    locations: [],
    ...v,
  }) as FromPriceListSelectedItem;

describe("expandItemPerLocation", () => {
  it("สองคลัง → สองแถว แต่ละแถวถือ qty ของคลังตัวเอง ไม่ใช่ยอดรวม", () => {
    const out = expandItemPerLocation(
      item({
        locations: [
          { id: "L1", location_code: "A", location_name: "คลัง A", order_qty: 3 },
          { id: "L2", location_code: "B", location_name: "คลัง B", order_qty: 5 },
        ],
      }),
    );
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.order_qty)).toEqual([3, 5]);
    expect(out.map((r) => r.location_id)).toEqual(["L1", "L2"]);
    expect(out.map((r) => r.location_name)).toEqual(["คลัง A", "คลัง B"]);
    // ยอดของแต่ละแถวคิดจาก qty ของแถวนั้น ไม่ใช่ 8 × 100
    expect(out.map((r) => r.sub_total_price)).toEqual([300, 500]);
  });

  it("คิดภาษีของแต่ละแถวแยกกัน", () => {
    const out = expandItemPerLocation(
      item({
        tax_rate: 10,
        locations: [{ id: "L1", order_qty: 2 }],
      }),
    );
    expect(out[0].sub_total_price).toBe(200);
    expect(out[0].tax_amount).toBe(20);
    expect(out[0].total_price).toBe(220);
  });

  it("base qty คิดตาม conversion ของแต่ละแถว", () => {
    const out = expandItemPerLocation(
      item({
        order_unit_conversion_factor: 12,
        locations: [{ id: "L1", order_qty: 2 }],
      }),
    );
    expect(out[0].base_qty).toBe(24);
  });

  it("คลังที่ยังไม่ได้เลือก (id ว่าง) ไม่ผลิตแถว", () => {
    const out = expandItemPerLocation(
      item({
        locations: [
          { id: "", order_qty: 9 },
          { id: "L1", order_qty: 1 },
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].location_id).toBe("L1");
  });

  it("ไม่ได้เลือกคลังเลย → ไม่มีแถวออกมา ไม่ใช่แถวเปล่า", () => {
    expect(expandItemPerLocation(item({ locations: [] }))).toEqual([]);
  });
});
