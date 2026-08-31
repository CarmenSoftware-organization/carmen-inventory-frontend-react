import { describe, it, expect } from "vitest";
import {
  PLT_DETAIL_EMPTY,
  createPltSchema,
  getDefaultValues,
  groupDetailsToProducts,
  type PltFormValues,
} from "./plt-form-schema";
import { getSubmitLabel } from "./plt-form-helpers";
import type { PriceListTemplate } from "@/types/price-list-template";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;
const schema = createPltSchema(tv, tf);

const valid: PltFormValues = {
  name: "แม่แบบผักสด",
  description: "",
  status: "draft",
  currency_id: "cur-thb",
  validity_period: null,
  vendor_instruction: "",
  details: [],
};

const paths = (v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("createPltSchema", () => {
  it("ชื่อแม่แบบกับสกุลเงินขาดไม่ได้", () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(paths({ ...valid, name: "" })).toContain("name");
    expect(paths({ ...valid, currency_id: "" })).toContain("currency_id");
  });

  it("อายุการใช้งานปล่อยว่างได้ (null) แต่ถ้ากรอกต้องเป็นตัวเลข", () => {
    expect(schema.safeParse({ ...valid, validity_period: null }).success).toBe(
      true,
    );
    expect(schema.safeParse({ ...valid, validity_period: 30 }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ ...valid, validity_period: "สามสิบ" }).success,
    ).toBe(false);
  });

  it("สถานะรับแค่สามค่า", () => {
    for (const status of ["draft", "active", "inactive"]) {
      expect(schema.safeParse({ ...valid, status }).success, status).toBe(true);
    }
    expect(schema.safeParse({ ...valid, status: "archived" }).success).toBe(
      false,
    );
  });

  it("แถวสินค้าต้องมีทั้งสินค้าและหน่วย และจำนวนติดลบไม่ได้", () => {
    const withDetail = (over: Partial<PltFormValues["details"][number]>) => ({
      ...valid,
      details: [
        { ...PLT_DETAIL_EMPTY, product_id: "p1", unit_id: "u1", ...over },
      ],
    });
    expect(schema.safeParse(withDetail({})).success).toBe(true);
    expect(paths(withDetail({ product_id: "" }))).toContain(
      "details.0.product_id",
    );
    expect(paths(withDetail({ unit_id: "" }))).toContain("details.0.unit_id");
    expect(paths(withDetail({ qty: -1 }))).toContain("details.0.qty");
    // 0 ได้ — แม่แบบที่ยังไม่กำหนดจำนวนขั้นต่ำ
    expect(paths(withDetail({ qty: 0 }))).not.toContain("details.0.qty");
  });
});

describe("getDefaultValues", () => {
  it("ไม่มีแม่แบบ = ฟอร์มเปล่าสถานะ draft พร้อมสกุลเงิน default ของ BU", () => {
    const d = getDefaultValues(undefined, { defaultCurrencyId: "cur-thb" });
    expect(d.status).toBe("draft");
    expect(d.currency_id).toBe("cur-thb");
    expect(d.details).toEqual([]);
  });

  it("แตก moq ของสินค้าหนึ่งตัวเป็นหลายแถวในฟอร์ม", () => {
    // API เก็บเป็น product → moq[] แต่ฟอร์มแก้ทีละแถว จึงต้องแบนออกมา
    const d = getDefaultValues({
      name: "T",
      status: "draft",
      validity_period: null,
      products: [
        {
          product_id: "p1",
          moq: [
            { unit_id: "u1", unit_name: "KG", qty: 5, note: "" },
            { unit_id: "u2", unit_name: "BOX", qty: 1, note: "ยกลัง" },
          ],
        },
      ],
    } as unknown as PriceListTemplate);
    expect(d.details).toHaveLength(2);
    expect(d.details.map((x) => x.unit_name)).toEqual(["KG", "BOX"]);
  });

  it("สินค้าที่ยังไม่มี moq ใช้หน่วยสั่งซื้อเริ่มต้นแทน ไม่หายไปจากฟอร์ม", () => {
    const d = getDefaultValues({
      name: "T",
      status: "draft",
      validity_period: null,
      products: [
        {
          product_id: "p1",
          moq: [],
          default_order: { unit_id: "u9", unit_name: "PCS" },
        },
      ],
    } as unknown as PriceListTemplate);
    expect(d.details).toEqual([
      { product_id: "p1", unit_id: "u9", unit_name: "PCS", qty: 0, note: "" },
    ]);
  });
});

describe("groupDetailsToProducts", () => {
  it("รวมแถวของสินค้าเดียวกันกลับเป็น moq array เดียว", () => {
    const out = groupDetailsToProducts([
      { product_id: "p1", unit_id: "u1", unit_name: "KG", qty: 5, note: "" },
      { product_id: "p2", unit_id: "u3", unit_name: "PCS", qty: 2, note: "" },
      { product_id: "p1", unit_id: "u2", unit_name: "BOX", qty: 1, note: "ก" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ product_id: "p1" });
    expect(out[0].moq).toHaveLength(2);
    expect(out[1].moq).toHaveLength(1);
  });

  it("ลำดับสินค้าเป็นไปตามที่เจอครั้งแรก ไม่สลับที่เอง", () => {
    const out = groupDetailsToProducts([
      { product_id: "b", unit_id: "u", unit_name: "", qty: 1, note: "" },
      { product_id: "a", unit_id: "u", unit_name: "", qty: 1, note: "" },
    ]);
    expect(out.map((p) => p.product_id)).toEqual(["b", "a"]);
  });

  it("ไม่มีแถวเลย = ไม่มีสินค้า ไม่ใช่ระเบิด", () => {
    expect(groupDetailsToProducts([])).toEqual([]);
  });
});

describe("getSubmitLabel", () => {
  const labels = {
    create: "สร้าง",
    creating: "กำลังสร้าง",
    save: "บันทึก",
    saving: "กำลังบันทึก",
  } as never;

  it("บอกสถานะที่กำลังเกิดขึ้นจริง ไม่ใช่คำเดียวทุกกรณี", () => {
    expect(getSubmitLabel(false, true, labels)).toBe("สร้าง");
    expect(getSubmitLabel(true, true, labels)).toBe("กำลังสร้าง");
    expect(getSubmitLabel(false, false, labels)).toBe("บันทึก");
    expect(getSubmitLabel(true, false, labels)).toBe("กำลังบันทึก");
  });
});
