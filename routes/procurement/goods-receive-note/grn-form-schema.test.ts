import { describe, it, expect } from "vitest";
import {
  EMPTY_DETAIL,
  EMPTY_EXTRA_COST,
  createGrnSchema,
  getDefaultValues,
  mapDetailToPayload,
  type GrnFormValues,
} from "./grn-form-schema";

const tv = ((k: string, p?: Record<string, string>) =>
  p?.field ? `${k}:${p.field}` : k) as never;
const tf = ((k: string) => k) as never;
const schema = createGrnSchema(tv, tf);

/** แถวที่กรอกครบพอจะผ่าน — รับของจริงจึงต้องมีราคา */
const item = (over: Partial<GrnFormValues["items"][number]> = {}) => ({
  ...EMPTY_DETAIL,
  product_id: "prod-1",
  location_id: "loc-1",
  received_unit_id: "unit-1",
  received_qty: 10,
  unit_price: 25,
  ...over,
});

const valid = (): GrnFormValues =>
  ({
    ...getDefaultValues(),
    invoice_no: "INV-001",
    invoice_date: "2026-08-31T00:00:00.000Z",
    vendor_id: "vendor-1",
    currency_id: "cur-1",
    items: [item()],
  }) as GrnFormValues;

const paths = (v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("createGrnSchema — หัวใบ", () => {
  it("ใบที่กรอกครบผ่าน", () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it("เลขที่ใบแจ้งหนี้ · วันที่ใบแจ้งหนี้ · ผู้ขาย · สกุลเงิน ขาดไม่ได้", () => {
    expect(paths({ ...valid(), invoice_no: "" })).toContain("invoice_no");
    expect(paths({ ...valid(), invoice_date: null })).toContain("invoice_date");
    expect(paths({ ...valid(), vendor_id: null })).toContain("vendor_id");
    expect(paths({ ...valid(), currency_id: "" })).toContain("currency_id");
  });

  it("ใบที่ไม่มีรายการเลย บันทึกไม่ได้", () => {
    expect(paths({ ...valid(), items: [] })).toContain("items");
  });
});

describe("createGrnSchema — กติกาของแถว", () => {
  it("สินค้า · คลัง · หน่วยที่รับ ขาดไม่ได้", () => {
    expect(
      paths({ ...valid(), items: [item({ product_id: null })] }),
    ).toContain("items.0.product_id");
    expect(
      paths({ ...valid(), items: [item({ location_id: null })] }),
    ).toContain("items.0.location_id");
    expect(
      paths({ ...valid(), items: [item({ received_unit_id: null })] }),
    ).toContain("items.0.received_unit_id");
  });

  it("รับของแล้วต้องมีราคา — ไม่งั้น backend ตอบ 400 ตอนกดบันทึก", () => {
    // นี่คือกติกาที่ superRefine มีไว้: received_price บังคับเมื่อ received_qty > 0
    for (const price of [0, undefined, -5]) {
      expect(
        paths({
          ...valid(),
          items: [item({ received_qty: 5, unit_price: price })],
        }),
        String(price),
      ).toContain("items.0.unit_price");
    }
  });

  it("แถวที่ยังไม่ได้รับของ (qty 0) ไม่บังคับราคา — ของแถมใช้ช่อง FOC แยก", () => {
    expect(
      paths({
        ...valid(),
        items: [item({ received_qty: 0, unit_price: 0, foc_qty: 3 })],
      }),
    ).not.toContain("items.0.unit_price");
  });

  it("ค่าใช้จ่ายเพิ่มเติมต้องเลือกประเภท และจำนวนเงินติดลบไม่ได้", () => {
    const withCost = (over: Partial<typeof EMPTY_EXTRA_COST>) => ({
      ...valid(),
      extra_cost_details: [
        { ...EMPTY_EXTRA_COST, extra_cost_type_id: "ec-1", ...over },
      ],
    });
    expect(schema.safeParse(withCost({})).success).toBe(true);
    expect(paths(withCost({ extra_cost_type_id: "" }))).toContain(
      "extra_cost_details.0.extra_cost_type_id",
    );
    expect(paths(withCost({ amount: -1 }))).toContain(
      "extra_cost_details.0.amount",
    );
  });
});

describe("getDefaultValues", () => {
  it("ใบใหม่เริ่มที่ draft และตั้งวันครบกำหนดเป็นวันนี้ ไม่ปล่อยว่าง", () => {
    const d = getDefaultValues();
    expect(d.doc_status).toBe("draft");
    expect(d.doc_type).toBe("purchase_order");
    expect(d.exchange_rate).toBe(1);
    // ปล่อย null ไว้จะไปติด required ตอนกดบันทึกทั้งที่คนกรอกไม่รู้ว่าต้องกรอก
    expect(d.payment_due_date).not.toBeNull();
    expect(d.items).toEqual([]);
  });

  it("รับสกุลเงิน default ของ BU มาเป็นค่าตั้งต้น", () => {
    const d = getDefaultValues(undefined, {
      defaultCurrencyId: "cur-thb",
      defaultCurrencyCode: "THB",
    });
    expect(d.currency_id).toBe("cur-thb");
    expect(d.currency_name).toBe("THB");
  });
});

describe("mapDetailToPayload", () => {
  it("ฟอร์มเก็บ unit_price แต่ backend ชื่อ received_price — ต้องแปลงชื่อ", () => {
    const p = mapDetailToPayload(item({ unit_price: 25 }));
    expect(p.received_price).toBe(25);
    expect("unit_price" in p).toBe(false);
  });

  it("ไม่มีราคา ส่ง 0 ไม่ใช่ undefined — ฟิลด์นี้ backend บังคับ", () => {
    expect(
      mapDetailToPayload(item({ unit_price: undefined })).received_price,
    ).toBe(0);
  });

  it("แถวใหม่ไม่ส่ง doc_version ส่วนแถวเดิมส่งไปด้วย (optimistic lock)", () => {
    expect("doc_version" in mapDetailToPayload(item())).toBe(false);
    expect(mapDetailToPayload(item({ doc_version: 3 })).doc_version).toBe(3);
  });

  it("ไม่มีโปรไฟล์ภาษี = ไม่ส่งฟิลด์นั้นเลย ไม่ใช่ส่ง null", () => {
    expect("tax_profile_id" in mapDetailToPayload(item())).toBe(false);
    expect(
      mapDetailToPayload(item({ tax_profile_id: "tax-1" })).tax_profile_id,
    ).toBe("tax-1");
  });
});
