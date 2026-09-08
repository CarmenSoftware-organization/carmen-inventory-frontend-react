import { describe, it, expect } from "vitest";
import { normalizeWorkflowProduct } from "../use-products-by-location";

/**
 * แถวจริงจาก `GET /api/config/{bu}/products-location-workflow/{loc}/{wf}`
 * (คัดมาจาก response จริงตอนไล่บั๊ก 2026-09-03) — สังเกตว่า `id` กับ `product_id`
 * เป็นคนละค่า เพราะแถวนี้คือ product_location ไม่ใช่ตัวสินค้า
 */
const ROW = {
  id: "0c47c77d-2353-4801-8dfe-a82b152265f6",
  product_id: "525a0be1-1644-491f-aef3-e2bf6aadd07c",
  product_code: "11140012",
  product_name: "Dried Roselle 1 kg – 26412252",
  product_local_name: "กระเจี๊ยบแห้ง 1กก. 26412252",
  product_sku: null,
  inventory_unit_id: "1ad8424e-4ca5-4fc2-8ef0-5ae4e6ed201e",
  inventory_unit_name: "KG",
};

describe("normalizeWorkflowProduct", () => {
  /**
   * ข้อนี้สำคัญกว่าที่ตาเห็น — ค่านี้ถูกเขียนลง `items[].product_id` แล้วส่งขึ้น
   * backend ถ้าหยิบ `id` มาตรง ๆ จะได้ id ของแถวเชื่อม ซึ่งไม่มีใครจับได้จนกว่า
   * จะบันทึกแล้วพัง (typecheck ช่วยไม่ได้เพราะ res.json() เป็น any)
   */
  it("ใช้ product_id เป็น id ไม่ใช่ id ของแถว product_location", () => {
    expect(normalizeWorkflowProduct(ROW).id).toBe(ROW.product_id);
    expect(normalizeWorkflowProduct(ROW).id).not.toBe(ROW.id);
  });

  it("แผลงชื่อ/รหัสจากฟิลด์ flat ที่ขึ้นต้น product_", () => {
    const p = normalizeWorkflowProduct(ROW);
    expect(p.code).toBe("11140012");
    expect(p.name).toBe("Dried Roselle 1 kg – 26412252");
    expect(p.local_name).toBe("กระเจี๊ยบแห้ง 1กก. 26412252");
  });

  it("product_sku ที่เป็น null ไม่กลายเป็น sku ว่างเปล่า", () => {
    expect(normalizeWorkflowProduct(ROW).sku).toBeUndefined();
    expect(normalizeWorkflowProduct({ ...ROW, product_sku: "SKU-1" }).sku).toBe(
      "SKU-1",
    );
  });

  it("ประกอบ inventory_unit เป็น object และเก็บ flat ไว้ด้วย", () => {
    const p = normalizeWorkflowProduct(ROW);
    expect(p.inventory_unit).toEqual({
      id: ROW.inventory_unit_id,
      name: "KG",
    });
    expect(p.inventory_unit_name).toBe("KG");
  });

  it("ไม่มีหน่วยก็ไม่ยัด object เปล่าให้", () => {
    const p = normalizeWorkflowProduct({
      ...ROW,
      inventory_unit_id: null,
      inventory_unit_name: null,
    });
    expect(p.inventory_unit).toBeUndefined();
    expect(p.inventory_unit_name).toBeUndefined();
  });

  it("ฟิลด์ที่ backend ส่ง null มาไม่กลายเป็นคำว่า null บนจอ", () => {
    const p = normalizeWorkflowProduct({
      ...ROW,
      product_code: null,
      product_name: null,
      product_local_name: null,
    });
    expect(p.code).toBe("");
    expect(p.name).toBe("");
    expect(p.local_name).toBe("");
  });
});
