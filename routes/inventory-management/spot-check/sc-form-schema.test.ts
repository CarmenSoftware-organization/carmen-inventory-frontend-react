import { describe, it, expect } from "vitest";
import {
  EMPTY_FORM,
  createSpotCheckSchema,
  getDefaultValues,
  mapFormToPayload,
  type SpotCheckFormValues,
} from "./sc-form-schema";
import { STATUS_VISUAL, METHOD_VISUAL } from "./sc-status-visual";
import type { SpotCheck } from "@/types/spot-check";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;
const schema = createSpotCheckSchema(tv, tf);

const form = (over: Partial<SpotCheckFormValues> = {}): SpotCheckFormValues =>
  ({
    ...EMPTY_FORM,
    location_id: "loc-1",
    items: 5,
    ...over,
  }) as SpotCheckFormValues;

const paths = (v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("createSpotCheckSchema", () => {
  it("ต้องเลือกคลังเสมอ ไม่ว่าวิธีไหน", () => {
    for (const method of ["random", "high_value", "manual"] as const) {
      expect(
        paths(
          form({
            method,
            location_id: "",
            min_value: 0,
            products: [{ product_id: "p1", product_name: "" }],
          }),
        ),
        method,
      ).toContain("location_id");
    }
  });

  it("สุ่ม/ของมูลค่าสูง ต้องระบุจำนวนรายการอย่างน้อย 1", () => {
    for (const method of ["random", "high_value"] as const) {
      expect(paths(form({ method, items: 0 })), method).toContain("items");
      expect(paths(form({ method, items: undefined })), method).toContain(
        "items",
      );
      expect(paths(form({ method, items: 1 })), method).not.toContain("items");
    }
  });

  it("ของมูลค่าสูง ต้องมีมูลค่าขั้นต่ำ (0 ได้ ติดลบไม่ได้)", () => {
    expect(paths(form({ method: "high_value", min_value: 0 }))).not.toContain(
      "min_value",
    );
    expect(paths(form({ method: "high_value", min_value: -1 }))).toContain(
      "min_value",
    );
  });

  it("เลือกเอง ต้องมีสินค้าอย่างน้อยหนึ่งตัว และห้ามมีแถวที่ยังไม่ได้เลือก", () => {
    const manual = (products: SpotCheckFormValues["products"]) =>
      paths(form({ method: "manual", products }));
    expect(manual([])).toContain("products");
    // แถวเปล่าปนมา = คนกดเพิ่มแถวแล้วยังไม่ได้เลือกสินค้า
    expect(manual([{ product_id: "", product_name: "" }])).toContain(
      "products",
    );
    expect(
      manual([
        { product_id: "p1", product_name: "" },
        { product_id: "", product_name: "" },
      ]),
    ).toContain("products");
    expect(manual([{ product_id: "p1", product_name: "" }])).not.toContain(
      "products",
    );
  });

  it("เลือกเอง ไม่บังคับจำนวนรายการ — คนเลือกสินค้าเองอยู่แล้ว", () => {
    expect(
      paths(
        form({
          method: "manual",
          items: 0,
          products: [{ product_id: "p1", product_name: "" }],
        }),
      ),
    ).not.toContain("items");
  });
});

describe("mapFormToPayload", () => {
  it("สุ่ม: ส่งแค่จำนวนรายการ ไม่มี min_value/product_id ติดไป", () => {
    const p = mapFormToPayload(form({ method: "random", items: 7 }));
    expect(p).toEqual({
      location_id: "loc-1",
      method: "random",
      items: 7,
      description: undefined,
      note: undefined,
    });
  });

  it("ของมูลค่าสูง: ส่งทั้งจำนวนรายการและมูลค่าขั้นต่ำ", () => {
    const p = mapFormToPayload(
      form({ method: "high_value", items: 3, min_value: 5000 }),
    );
    expect(p).toMatchObject({
      method: "high_value",
      items: 3,
      min_value: 5000,
    });
  });

  it("เลือกเอง: ส่ง product_id เป็น array และคัดแถวเปล่าออก", () => {
    const p = mapFormToPayload(
      form({
        method: "manual",
        products: [
          { product_id: "p1", product_name: "ก" },
          { product_id: "", product_name: "" },
          { product_id: "p2", product_name: "ข" },
        ],
      }),
    );
    expect(p).toMatchObject({ method: "manual", product_id: ["p1", "p2"] });
  });

  it("คำอธิบาย/หมายเหตุที่ว่าง ส่ง undefined ไม่ใช่ string ว่าง", () => {
    const p = mapFormToPayload(form({ description: "", note: "  x" }));
    expect(p.description).toBeUndefined();
    expect(p.note).toBe("  x");
  });
});

describe("getDefaultValues", () => {
  it("ไม่มี entity = ฟอร์มเปล่าแบบสุ่ม", () => {
    const d = getDefaultValues();
    expect(d.method).toBe("random");
    expect(d.products).toEqual([]);
  });

  it("แปลง product_id ที่ API ส่งเป็น array ของ string กลับเป็นแถวในฟอร์ม", () => {
    const d = getDefaultValues({
      location_id: "loc-9",
      method: "manual",
      product_id: ["p1", "p2"],
    } as SpotCheck);
    expect(d.products).toEqual([
      { product_id: "p1", product_name: "" },
      { product_id: "p2", product_name: "" },
    ]);
  });
});

describe("sc-status-visual", () => {
  it("ทุกสถานะที่ backend ส่งได้ มีหน้าตากำหนดไว้ครบ", () => {
    for (const s of [
      "pending",
      "in_progress",
      "completed",
      "void",
      "voided",
      "cancelled",
    ] as const) {
      expect(STATUS_VISUAL[s], s).toBeDefined();
    }
  });

  it("void/voided/cancelled ใช้หน้าตาเดียวกัน — เป็นเรื่องเดียวกันในสายตาคนใช้", () => {
    expect(STATUS_VISUAL.void).toEqual(STATUS_VISUAL.voided);
    expect(STATUS_VISUAL.void).toEqual(STATUS_VISUAL.cancelled);
  });

  it("ไม่มีสถานะไหนกะพริบ (DESIGN.md ห้าม neon)", () => {
    for (const v of Object.values(STATUS_VISUAL)) expect(v.pulse).toBe(false);
  });

  it("ทั้งสามวิธีมีไอคอนของตัวเอง ไม่ซ้ำกัน", () => {
    const icons = Object.values(METHOD_VISUAL).map((m) => m.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
