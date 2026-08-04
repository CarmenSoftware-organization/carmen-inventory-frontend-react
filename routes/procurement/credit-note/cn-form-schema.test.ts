import { describe, it, expect } from "vitest";
import {
  CN_ITEM,
  createCnSchema,
  EMPTY_FORM,
  keepGrnRefs,
  type CnFormValues,
} from "./cn-form-schema";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;

const schema = createCnSchema(tv, tf);

/** ใบที่กรอกหัวครบแล้ว เหลือแต่ items ให้แต่ละเทสใส่เอง */
function form(
  overrides: Partial<CnFormValues> & Pick<CnFormValues, "items">,
): CnFormValues {
  return {
    ...EMPTY_FORM,
    grn_id: "grn-1",
    grn_date: "2026-08-01T00:00:00.000Z",
    vendor_id: "v-1",
    cn_date: "2026-08-04T00:00:00.000Z",
    reason: "r-1",
    currency_code: "THB",
    exchange_rate: 1,
    tax_invoice_no: "TAX-001",
    tax_invoice_date: "2026-08-04T00:00:00.000Z",
    ...overrides,
  };
}

/** 1 แถวที่กรอกครบ — received/quantity/net ปรับได้ตามเทส */
function item(overrides: Partial<CnFormValues["items"][number]> = {}) {
  return {
    ...CN_ITEM,
    _group_key: "g1",
    location_id: "loc-1",
    item_id: "prod-1",
    unit_id: "unit-1",
    ...overrides,
  };
}

/** path ของ issue แรกที่ตกในแถวที่ index นั้น */
function firstItemIssuePath(result: ReturnType<typeof schema.safeParse>) {
  return result.success ? undefined : result.error.issues[0]?.path.join(".");
}

describe("createCnSchema — เงื่อนไขต่อแถวแยกตามประเภทใบ", () => {
  it("quantity_return: จำนวนคืน 0 ไม่ผ่าน", () => {
    const result = schema.safeParse(
      form({ items: [item({ quantity: 0, _grn_received_qty: 4 })] }),
    );
    expect(result.success).toBe(false);
    expect(firstItemIssuePath(result)).toBe("items.0.quantity");
  });

  it("quantity_return: คืนเกินจำนวนที่รับไม่ผ่าน", () => {
    const result = schema.safeParse(
      form({ items: [item({ quantity: 5, _grn_received_qty: 4 })] }),
    );
    expect(result.success).toBe(false);
    expect(firstItemIssuePath(result)).toBe("items.0.quantity");
  });

  it("quantity_return: รับมา 0 จริง คืนเท่าไหร่ก็ไม่ผ่าน", () => {
    const result = schema.safeParse(
      form({ items: [item({ quantity: 1, _grn_received_qty: 0 })] }),
    );
    expect(result.success).toBe(false);
    expect(firstItemIssuePath(result)).toBe("items.0.quantity");
  });

  it("quantity_return: ยังไม่รู้ยอดที่รับ (null) ไม่บังคับเพดาน", () => {
    const result = schema.safeParse(
      form({ items: [item({ quantity: 99, _grn_received_qty: null })] }),
    );
    expect(result.success).toBe(true);
  });

  it("quantity_return: คืนเป็นเศษได้ ถ้าไม่เกินเพดาน", () => {
    const result = schema.safeParse(
      form({ items: [item({ quantity: 2.5, _grn_received_qty: 4 })] }),
    );
    expect(result.success).toBe(true);
  });

  it("amount_discount: ยอดลดหนี้ > 0 ผ่านได้ทั้งที่จำนวนคืนเป็น 0", () => {
    const result = schema.safeParse(
      form({
        credit_note_type: "amount_discount",
        items: [item({ quantity: 0, net_amount: 500 })],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("amount_discount: ยอดลดหนี้ 0 ไม่ผ่าน และตกที่ช่องที่ผู้ใช้เห็นจริง", () => {
    const result = schema.safeParse(
      form({
        credit_note_type: "amount_discount",
        items: [item({ quantity: 0, net_amount: 0 })],
      }),
    );
    expect(result.success).toBe(false);
    expect(firstItemIssuePath(result)).toBe("items.0.net_amount");
  });

  it("amount_discount: ไม่สนเพดานจำนวนคืน (จำนวนเป็นแค่ค่าอ้างอิง)", () => {
    const result = schema.safeParse(
      form({
        credit_note_type: "amount_discount",
        items: [item({ quantity: 99, _grn_received_qty: 4, net_amount: 500 })],
      }),
    );
    expect(result.success).toBe(true);
  });
});

describe("keepGrnRefs", () => {
  it("ยกค่าอ้างอิงฝั่ง GRN ของแถวเดิมมาใส่ค่า default ชุดใหม่", () => {
    const next = form({
      items: [item({ id: "d1", _grn_received_qty: null, quantity: 2 })],
    });
    const current = [
      item({ id: "d1", _grn_received_qty: 4, _grn_price: 25, quantity: 2 }),
    ];
    const merged = keepGrnRefs(next, current);
    expect(merged.items[0]._grn_received_qty).toBe(4);
    expect(merged.items[0]._grn_price).toBe(25);
  });

  it("แถวที่ยังไม่รู้ค่าเดิม ปล่อยเป็น null ตามเดิม", () => {
    const next = form({ items: [item({ id: "d1", _grn_received_qty: null })] });
    const current = [item({ id: "d1", _grn_received_qty: null })];
    expect(keepGrnRefs(next, current).items[0]._grn_received_qty).toBeNull();
  });

  it("แถวที่ไม่ match id ไม่หยิบค่าของแถวอื่นมาใช้", () => {
    const next = form({ items: [item({ id: "d2", _grn_received_qty: null })] });
    const current = [item({ id: "d1", _grn_received_qty: 4 })];
    expect(keepGrnRefs(next, current).items[0]._grn_received_qty).toBeNull();
  });
});
