import { describe, it, expect } from "vitest";
import { getDefaultValues, mapItemToPayload } from "./ia-form-schema";
import type { InventoryAdjustment } from "@/types/inventory-adjustment";

/** ตัดมาจาก response จริงของ GET /stock-in/:id (ตัดฟิลด์ที่ฟอร์มไม่ได้ใช้ออก) */
const adjustment = {
  id: "db0c651b-fd83-43e7-99e8-893ebcbf3a18",
  si_date: "2026-05-31T00:00:00.000Z",
  si_no: "SI260500008",
  description: "555",
  adjustment_type_id: "c0fa2904-e708-4d28-84fe-f0dda8686f0f",
  doc_status: "draft",
  location_id: "47414c16-9d52-4b16-8428-4a4c4e89986e",
  stock_in_detail: [
    {
      id: "6e9ab38b-3174-489f-85e5-70645b206c4a",
      sequence_no: 1,
      product_id: "101a24a6-d6e5-450f-8ee6-665779eb4210",
      product_name: "Brushtail Estate Grey Label Sparkling 33033",
      product_code: "22060006",
      product_local_name: "Brushtail Estate Grey Label Sparkling 33033",
      // หน่วยนับมาเป็น object ไม่ใช่ flat string — จุดที่เคยอ่านพลาด
      inventory_unit: {
        id: "b5b22dba-fff4-4662-8e43-b25566402461",
        name: "BTL",
      },
      description: null,
      qty: 20,
      cost_per_unit: 300,
      total_cost: 6000,
      doc_version: 0,
    },
  ],
} as unknown as InventoryAdjustment;

describe("getDefaultValues", () => {
  // endpoint รายละเอียดคืน inventory_unit เป็น object ส่วน list คืน flat string
  // อ่านทางเดียวแล้วคอลัมน์ Unit ว่างทุกใบที่เปิดขึ้นมาแก้
  it("อ่านหน่วยนับจาก object ที่ backend ส่งมาจริง", () => {
    const values = getDefaultValues(adjustment);

    expect(values.items[0].unit_name).toBe("BTL");
  });

  it("ยังอ่านแบบ flat string ได้ (endpoint list)", () => {
    const flat = {
      ...adjustment,
      stock_in_detail: [
        {
          ...adjustment.stock_in_detail![0],
          inventory_unit: undefined,
          inventory_unit_name: "KG",
        },
      ],
    } as unknown as InventoryAdjustment;

    expect(getDefaultValues(flat).items[0].unit_name).toBe("KG");
  });

  it("ที่เหลือ map ครบตาม response", () => {
    const values = getDefaultValues(adjustment);

    expect(values).toMatchObject({
      description: "555",
      doc_status: "draft",
      adjustment_type_id: "c0fa2904-e708-4d28-84fe-f0dda8686f0f",
      date: "2026-05-31T00:00:00.000Z",
      location_id: "47414c16-9d52-4b16-8428-4a4c4e89986e",
    });
    expect(values.items[0]).toMatchObject({
      id: "6e9ab38b-3174-489f-85e5-70645b206c4a",
      product_id: "101a24a6-d6e5-450f-8ee6-665779eb4210",
      product_name: "Brushtail Estate Grey Label Sparkling 33033",
      qty: 20,
      cost_per_unit: 300,
      total_cost: 6000,
      // description เป็น null ในฐานข้อมูล ต้องกลายเป็นสตริงว่าง ไม่ใช่ null
      description: "",
    });
  });
});

describe("mapItemToPayload", () => {
  // /save ตอบ 400 "stock_in_detail.update.0.doc_version: Required" ถ้าไม่ส่งกลับ
  it("แถวที่มีอยู่แล้วส่ง doc_version กลับไปด้วย", () => {
    const item = getDefaultValues(adjustment).items[0];

    expect(mapItemToPayload(item)).toMatchObject({ doc_version: 0 });
  });

  // แถวที่เพิ่งกดเพิ่มยังไม่มีเวอร์ชัน ส่ง undefined ไปจะกลายเป็น invalid_type
  it("แถวใหม่ไม่มี doc_version ในผลลัพธ์เลย", () => {
    const payload = mapItemToPayload({
      product_id: "p1",
      product_name: "",
      product_local_name: "",
      unit_name: "",
      qty: 1,
      cost_per_unit: 1,
      total_cost: 1,
      description: "",
    });

    expect("doc_version" in payload).toBe(false);
  });
});
