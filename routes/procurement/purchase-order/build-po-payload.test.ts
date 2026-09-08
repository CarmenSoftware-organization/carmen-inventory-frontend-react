import { describe, it, expect } from "vitest";
import { buildPoPayload } from "./build-po-payload";
import { mapItemToPayload, PO_ITEM, type PoFormValues } from "./po-form-schema";
import { PO_TYPE } from "@/types/purchase-order";

/**
 * ตัวที่ตัดสินว่าจะบอก backend ให้ **เพิ่ม/แก้/ลบ** รายการไหนบ้าง — พลาดแล้วเงียบ
 * ทั้งสองทาง: ส่ง remove เกินคือรายการหายจากใบโดยไม่มีใครสั่ง ส่ง update ไม่ครบ
 * คือแก้แล้วไม่เข้า ทั้งคู่ไม่มี typecheck ตัวไหนจับได้เพราะรูปร่าง payload ถูกเสมอ
 */

const location = (over: Partial<PoFormValues["items"][number]["locations"][number]> = {}) => ({
  ...PO_ITEM.locations[0],
  id: "loc-1",
  order_qty: 10,
  ...over,
});

const item = (over: Partial<PoFormValues["items"][number]> = {}) =>
  ({
    ...PO_ITEM,
    product_id: "prod-1",
    order_unit_id: "unit-1",
    price: 25,
    locations: [location()],
    ...over,
  }) as PoFormValues["items"][number];

const values = (items: PoFormValues["items"]): PoFormValues =>
  ({
    workflow_id: "wf-1",
    vendor_id: "vendor-1",
    vendor_name: "Vendor",
    currency_id: "cur-1",
    currency_code: "THB",
    exchange_rate: 1,
    description: "",
    order_date: "2026-01-01",
    delivery_date: "2026-01-05",
    buyer_id: "buyer-1",
    buyer_name: "Buyer",
    email: "buyer@example.com",
    remarks: "",
    note: "",
    items,
  }) as unknown as PoFormValues;

describe("mapItemToPayload", () => {
  it("ยอดต่อ location คิดจาก ราคา × จำนวน แล้วหักส่วนลดก่อนคิดภาษี", () => {
    const payload = mapItemToPayload(
      item({
        price: 100,
        locations: [location({ order_qty: 2, discount_rate: 10, tax_rate: 7 })],
      }),
      0,
    );
    const loc = payload.locations[0];
    expect(loc.sub_total_price).toBe(200);
    expect(loc.discount_amount).toBe(20);
    expect(loc.net_amount).toBe(180);
    expect(loc.tax_amount).toBe(12.6);
    expect(loc.total_price).toBe(192.6);
  });

  it("ยอดระดับรายการ = ผลรวมทุก location ไม่ใช่คิดใหม่จากราคา", () => {
    const payload = mapItemToPayload(
      item({
        price: 100,
        locations: [
          location({ id: "loc-1", order_qty: 2 }),
          location({ id: "loc-2", order_qty: 3 }),
        ],
      }),
      0,
    );
    expect(payload.net_amount).toBe(500);
    expect(payload.total_price).toBe(500);
  });

  it("override ส่วนลด = ใช้ยอดที่กรอกเอง ไม่คิดจาก rate", () => {
    const payload = mapItemToPayload(
      item({
        price: 100,
        locations: [
          location({
            order_qty: 2,
            discount_rate: 10,
            discount_amount: 50,
            is_discount_adjustment: true,
          }),
        ],
      }),
      0,
    );
    expect(payload.locations[0].discount_amount).toBe(50);
    expect(payload.locations[0].net_amount).toBe(150);
  });

  it("sequence เริ่มที่ 1 ไม่ใช่ 0 — backend เรียงตามเลขนี้", () => {
    expect(mapItemToPayload(item(), 0).sequence).toBe(1);
    expect(mapItemToPayload(item(), 4).sequence).toBe(5);
  });

  it("order_base_qty แปลงด้วย conversion factor ของหน่วยสั่งซื้อ", () => {
    const payload = mapItemToPayload(
      item({
        order_unit_conversion_factor: 12,
        locations: [location({ order_qty: 2 })],
      }),
      0,
    );
    expect(payload.locations[0].order_qty).toBe(2);
    expect(payload.locations[0].order_base_qty).toBe(24);
  });
});

describe("buildPoPayload — diff ของรายการ", () => {
  it("รายการใหม่ (ยังไม่มี id) เข้า add", () => {
    const fresh = item();
    const payload = buildPoPayload(values([fresh]), []);
    const detail = payload.details.purchase_order_detail;
    expect(detail.add).toHaveLength(1);
    expect(detail.update).toBeUndefined();
    expect(detail.remove).toBeUndefined();
  });

  it("ไม่แตะอะไรเลย = ไม่ส่งทั้ง add/update/remove", () => {
    const existing = item({ id: "item-1" });
    const payload = buildPoPayload(values([existing]), [existing]);
    expect(payload.details.purchase_order_detail).toEqual({});
  });

  it("แก้ราคา = เข้า update ไม่ใช่ add", () => {
    const before = item({ id: "item-1", price: 25 });
    const after = item({ id: "item-1", price: 30 });
    const detail = buildPoPayload(values([after]), [before]).details
      .purchase_order_detail;
    expect(detail.update).toHaveLength(1);
    expect(detail.add).toBeUndefined();
  });

  it("รายการที่หายไปจากฟอร์ม = เข้า remove ด้วย id ของมัน", () => {
    const kept = item({ id: "item-1" });
    const dropped = item({ id: "item-2" });
    const detail = buildPoPayload(values([kept]), [kept, dropped]).details
      .purchase_order_detail;
    expect(detail.remove).toEqual([{ id: "item-2" }]);
    expect(detail.update).toBeUndefined();
  });

  it("สลับลำดับรายการนับเป็นการแก้ เพราะ sequence เปลี่ยน", () => {
    const a = item({ id: "item-1" });
    const b = item({ id: "item-2", product_id: "prod-2" });
    const detail = buildPoPayload(values([b, a]), [a, b]).details
      .purchase_order_detail;
    expect(detail.update).toHaveLength(2);
  });
});

describe("buildPoPayload — หัวใบ", () => {
  it("ไม่มีเทอมเครดิต = ไม่ส่งคีย์เทอมเครดิตเลย ไม่ใช่ส่งค่าว่าง", () => {
    const details = buildPoPayload(values([item()]), []).details as Record<
      string,
      unknown
    >;
    expect("credit_term_id" in details).toBe(false);
    expect("credit_term_name" in details).toBe(false);
    expect("credit_term_value" in details).toBe(false);
  });

  it("มีเทอมเครดิต = ส่งครบทั้งสามคีย์", () => {
    const v = {
      ...values([item()]),
      credit_term_id: "ct-1",
      credit_term_name: "30 days",
      credit_term_value: 30,
    } as PoFormValues;
    const details = buildPoPayload(v, []).details as Record<string, unknown>;
    expect(details.credit_term_id).toBe("ct-1");
    expect(details.credit_term_value).toBe(30);
  });

  it("doc_version ส่งเมื่อมีเท่านั้น — optimistic lock ของใบที่มีอยู่แล้ว", () => {
    const withoutVersion = buildPoPayload(values([item()]), [])
      .details as Record<string, unknown>;
    expect("doc_version" in withoutVersion).toBe(false);

    const v = { ...values([item()]), doc_version: 3 } as PoFormValues;
    const withVersion = buildPoPayload(v, []).details as Record<string, unknown>;
    expect(withVersion.doc_version).toBe(3);
  });

  it("po_type ส่งเฉพาะตอน caller ระบุมา", () => {
    const plain = buildPoPayload(values([item()]), []).details as Record<
      string,
      unknown
    >;
    expect("po_type" in plain).toBe(false);

    const typed = buildPoPayload(values([item()]), [], {
      po_type: PO_TYPE.MANUAL,
    }).details as Record<string, unknown>;
    expect(typed.po_type).toBe(PO_TYPE.MANUAL);
  });
});
