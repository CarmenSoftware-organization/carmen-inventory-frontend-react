import { describe, it, expect } from "vitest";
import type { PoForGrn } from "@/types/purchase-order";
import {
  isDetailUsable,
  isPoUsable,
  selectableDetailIds,
  usableLocations,
} from "./grn-po-usable";
import { mapPoDetailToItems } from "./grn-item-table";

/**
 * ตัดตามรูปร่างจริงของ `GET .../purchase-order/grn/vendor/{id}` — `can_use` มา
 * **สามชั้น** (ใบสั่งซื้อ · รายการ · คลัง) และ `locations[]` ยังซ้อนอยู่ในรายการ
 * ต่างจากฝั่งฟอร์ม PO ที่แบนไปแล้ว
 */
const loc = (
  id: string,
  over: { can_use?: boolean; order_qty?: number } = {},
) => ({
  location_id: id,
  location_code: id.toUpperCase(),
  location_name: `Location ${id}`,
  location_type: "inventory",
  order_qty: over.order_qty ?? 2,
  received_qty: 0,
  foc_qty: 0,
  remain_qty: over.order_qty ?? 2,
  ...(over.can_use === undefined ? {} : { can_use: over.can_use }),
});

const detail = (
  id: string,
  locations: ReturnType<typeof loc>[],
  canUse?: boolean,
) => ({
  id,
  sequence_no: 1,
  product_id: "prod-beef",
  product_code: "11110004",
  product_name: "AAA Beef Tenderloin",
  product_local_name: "เนื้อสันในโคขุน AAA",
  order_qty: 5,
  order_unit_id: "unit-kg",
  order_unit_name: "KG",
  order_unit_conversion_factor: 1,
  base_qty: 5,
  base_unit_id: "unit-kg",
  base_unit_name: "KG",
  received_qty: 0,
  cancelled_qty: 0,
  price: 212,
  net_amount: 411.28,
  is_foc: false,
  locations,
  ...(canUse === undefined ? {} : { can_use: canUse }),
});

const po = (
  id: string,
  details: ReturnType<typeof detail>[],
  canUse?: boolean,
) =>
  ({
    id,
    po_no: `PO${id}`,
    po_status: "sent",
    grn_status: "open",
    vendor_id: "vendor-1",
    vendor_name: "Vendor",
    order_date: "2026-03-24T11:07:05.946Z",
    delivery_date: "2026-03-30T17:00:00.000Z",
    currency_id: "cur-thb",
    currency_code: "THB",
    exchange_rate: 1,
    po_detail: details,
    ...(canUse === undefined ? {} : { can_use: canUse }),
  }) as unknown as PoForGrn;

describe("can_use — ไม่ส่งมาถือว่าใช้ได้", () => {
  it("หลังบ้านรุ่นที่ยังไม่มีฟิลด์นี้ ทุกชั้นยังใช้ได้ตามปกติ", () => {
    const p = po("1", [detail("d1", [loc("a"), loc("b")])]);
    expect(isPoUsable(p)).toBe(true);
    expect(isDetailUsable(p, p.po_detail[0])).toBe(true);
    expect(usableLocations(p, p.po_detail[0])).toHaveLength(2);
    expect(selectableDetailIds([p])).toEqual(["d1"]);
  });

  it("`true` ก็คือใช้ได้ (เคสปกติของ response ใหม่)", () => {
    const p = po("1", [detail("d1", [loc("a", { can_use: true })], true)], true);
    expect(selectableDetailIds([p])).toEqual(["d1"]);
  });
});

describe("can_use — ชั้นบนคุมชั้นล่าง", () => {
  it("ใบใช้ไม่ได้ = ทุกรายการในใบนั้นติ๊กไม่ได้ แม้รายการจะบอกว่าใช้ได้", () => {
    const p = po("1", [detail("d1", [loc("a")], true)], false);
    expect(isPoUsable(p)).toBe(false);
    expect(isDetailUsable(p, p.po_detail[0])).toBe(false);
    expect(usableLocations(p, p.po_detail[0])).toEqual([]);
    expect(selectableDetailIds([p])).toEqual([]);
  });

  it("รายการใช้ไม่ได้ = คลังใต้รายการนั้นไม่เหลือ แม้คลังจะบอกว่าใช้ได้", () => {
    const p = po("1", [detail("d1", [loc("a", { can_use: true })], false)]);
    expect(usableLocations(p, p.po_detail[0])).toEqual([]);
    expect(selectableDetailIds([p])).toEqual([]);
  });
});

describe("can_use — ระดับคลัง", () => {
  it("คัดเฉพาะคลังที่ใช้ได้ ไม่ใช่คืนทั้งหมดแล้วไปกรองทีหลัง", () => {
    const p = po("1", [
      detail("d1", [loc("a", { can_use: false }), loc("b", { can_use: true })]),
    ]);
    expect(usableLocations(p, p.po_detail[0]).map((l) => l.location_id)).toEqual(
      ["b"],
    );
  });

  it("ทุกคลังใช้ไม่ได้ = ติ๊กรายการนั้นไม่ได้ ไม่งั้นได้ใบรับสินค้าที่ไม่มีแถวเลย", () => {
    const p = po("1", [
      detail("d1", [loc("a", { can_use: false }), loc("b", { can_use: false })]),
      detail("d2", [loc("c")]),
    ]);
    expect(selectableDetailIds([p])).toEqual(["d2"]);
  });

  it("รายการที่ไม่มีคลังติดมาเลยยังติ๊กได้ — ผู้ใช้เลือกคลังเองในฟอร์ม", () => {
    const p = po("1", [detail("d1", [])]);
    expect(selectableDetailIds([p])).toEqual(["d1"]);
  });
});

describe("mapPoDetailToItems กับ can_use ของคลัง", () => {
  it("คลังที่ใช้ไม่ได้ไม่กลายเป็นแถวในใบรับสินค้า", () => {
    const d = detail("d1", [
      loc("a", { can_use: false, order_qty: 2 }),
      loc("b", { can_use: true, order_qty: 3 }),
    ]);
    const items = mapPoDetailToItems(d, "po-1", "PO001");
    expect(items).toHaveLength(1);
    expect(items[0].location_id).toBe("b");
    expect(items[0].received_qty).toBe(3);
  });

  it("ทุกคลังใช้ไม่ได้ = ไม่มีแถวออกมา ไม่ใช่ตกไปเป็นแถวที่ไม่มีคลัง", () => {
    // สาขา "ไม่มี locations" มีไว้สำหรับ PO ที่ไม่ได้ระบุคลังมาแต่แรกเท่านั้น —
    // ถ้าปล่อยให้เคสนี้ตกไปที่นั่นจะได้แถวที่คลังว่างและแก้ไม่ได้
    const d = detail("d1", [
      loc("a", { can_use: false }),
      loc("b", { can_use: false }),
    ]);
    expect(mapPoDetailToItems(d, "po-1", "PO001")).toEqual([]);
  });

  it("PO ที่ไม่ได้ระบุคลังมาแต่แรก ยังได้แถวเดียวให้ผู้ใช้เลือกคลังเอง", () => {
    const d = detail("d1", []);
    const items = mapPoDetailToItems(d, "po-1", "PO001");
    expect(items).toHaveLength(1);
    expect(items[0].location_id).toBeNull();
    expect(items[0].purchase_order_detail_id).toBe("d1");
  });
});
