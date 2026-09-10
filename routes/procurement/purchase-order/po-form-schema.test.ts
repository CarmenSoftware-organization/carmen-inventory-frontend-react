import { describe, it, expect } from "vitest";
import {
  getDefaultValues,
  mapItemToPayload,
  type PoFormValues,
} from "./po-form-schema";
import type { PurchaseOrder } from "@/types/purchase-order";

/**
 * ปักรูปร่างของ response ใหม่ที่ backend เลิก group location (2026-09-09)
 *
 * ของเดิมแถวหนึ่งมี `locations: PoDetailLocation[]` ซ้อนอยู่ แล้ว `order_qty`
 * ระดับแถวเป็นผลรวมของทุกคลัง — ตอนนี้ **แถวหนึ่ง = คลังเดียว** ค่าคลังอยู่บนแถว
 * ตรง ๆ ส่วนยอดที่รับแล้วย้ายไปอยู่ใน `pr_details[]` ไม่ได้อยู่บนแถวอีกต่อไป
 *
 * ทั้ง fixture นี้ตัดมาจากรูปร่างจริงของ `GET /{bu}/purchase-orders/{id}`
 */
const poResponse = {
  id: "po-1",
  role: "purchase",
  po_no: "PO20260300042",
  po_status: "draft",
  po_type: "manual",
  workflow_id: null,
  workflow_name: "",
  workflow_current_stage: null,
  workflow_previous_stage: null,
  workflow_next_stage: null,
  vendor_id: "vendor-1",
  vendor_name: "NOK Work Permit&Visa",
  vendor: { id: "vendor-1", name: "NOK Work Permit&Visa" },
  delivery_date: "2026-09-20T00:00:00.000Z",
  currency_id: "cur-thb",
  currency_code: "THB",
  currency: { id: "cur-thb", code: "THB" },
  exchange_rate: 1,
  description: "",
  order_date: "2026-09-10T00:00:00.000Z",
  credit_term_id: null,
  credit_term_name: null,
  credit_term_value: 0,
  buyer_id: "user-1",
  buyer_name: "ศิริวรรณ Purchase k ทองดี",
  email: "",
  remarks: "",
  approval_date: null,
  user_action: {},
  info: {},
  doc_version: 3,
  total_amount: 2632,
  purchase_order_detail: [
    {
      id: "detail-a",
      doc_version: 1,
      sequence_no: 1,
      stage_status: null,
      current_stage_status: "pending",
      description: "",
      product_id: "prod-roselle",
      product_code: "11140012",
      product_name: "Dried Roselle 1 kg",
      product_local_name: "กระเจี๊ยบแห้ง 1กก.",
      product_sku: "11140012",
      order_unit_id: "unit-kg",
      order_unit_name: "KG",
      order_unit_conversion_factor: 1,
      order_qty: 23,
      base_unit_id: "unit-kg",
      base_unit_name: "KG",
      base_qty: 23,
      price: 56,
      sub_total_price: 1288,
      net_amount: 1288,
      total_price: 1288,
      base_sub_total_price: 1288,
      base_net_amount: 1288,
      base_total_price: 1288,
      tax_profile_id: null,
      tax_profile_name: "",
      tax_rate: 0,
      tax_amount: 0,
      is_foc: false,
      foc_qty: 0,
      discount_rate: 0,
      discount_amount: 0,
      stages_status: {},
      info: {},
      // แถวหนึ่ง = คลังเดียว
      location_id: "loc-direct",
      location_code: "2FO03",
      location_name: "Rooms-Front Office - Direct",
      delivery_point_id: "dp-1",
      delivery_point_name: "Main Store",
      // ยอดที่รับแล้วอยู่ในนี้ ไม่ได้อยู่บนแถว
      pr_details: [
        {
          pr_detail_id: "pr-detail-1",
          order_qty: 20,
          order_base_qty: 20,
          received_qty: 8,
          foc_qty: 0,
        },
        {
          pr_detail_id: "pr-detail-2",
          order_qty: 3,
          order_base_qty: 3,
          received_qty: 5,
          foc_qty: 0,
        },
      ],
    },
    {
      id: "detail-b",
      doc_version: 2,
      sequence_no: 2,
      stage_status: null,
      current_stage_status: "pending",
      description: "",
      product_id: "prod-roselle",
      product_code: "11140012",
      product_name: "Dried Roselle 1 kg",
      product_local_name: "กระเจี๊ยบแห้ง 1กก.",
      product_sku: "11140012",
      order_unit_id: "unit-kg",
      order_unit_name: "KG",
      order_unit_conversion_factor: 1,
      order_qty: 24,
      base_unit_id: "unit-kg",
      base_unit_name: "KG",
      base_qty: 24,
      price: 56,
      sub_total_price: 1344,
      net_amount: 1344,
      total_price: 1344,
      tax_profile_id: null,
      tax_profile_name: "",
      tax_rate: 0,
      tax_amount: 0,
      is_foc: false,
      foc_qty: 0,
      discount_rate: 0,
      discount_amount: 0,
      // คลังว่างได้ — PO ที่ยังไม่ระบุคลัง
      location_id: null,
      location_code: null,
      location_name: null,
      delivery_point_id: null,
      delivery_point_name: null,
      pr_details: [],
    },
  ],
} as unknown as PurchaseOrder;

describe("getDefaultValues ตาม response ใหม่", () => {
  it("สินค้าเดียวกันสองคลังได้สองแถว ไม่ยุบรวม", () => {
    const values = getDefaultValues(poResponse);
    expect(values.items).toHaveLength(2);
    expect(values.items.map((i) => i.location_id)).toEqual([
      "loc-direct",
      null,
    ]);
    expect(values.items.map((i) => i.order_qty)).toEqual([23, 24]);
  });

  it("คลังกับจุดส่งของอ่านจากแถวตรง ๆ ไม่ใช่จาก locations[0]", () => {
    const [first] = getDefaultValues(poResponse).items;
    expect(first.location_code).toBe("2FO03");
    expect(first.location_name).toBe("Rooms-Front Office - Direct");
    expect(first.delivery_point_id).toBe("dp-1");
    expect(first.delivery_point_name).toBe("Main Store");
  });

  it("คลังที่ยังไม่ระบุเป็น null ไม่ใช่สตริงว่าง", () => {
    // schema บังคับ location_id ผ่าน refine — สตริงว่างจะผ่าน `!!v` ไม่ได้อยู่ดี
    // แต่ null สื่อว่า "ยังไม่เลือก" ตรงกว่า และ payload ส่ง null กลับไปเหมือนกัน
    const [, second] = getDefaultValues(poResponse).items;
    expect(second.location_id).toBeNull();
    expect(second.location_code).toBe("");
  });

  it("ยอดที่รับแล้วรวมจากทุกใบ PR ที่แถวนั้นอ้างถึง", () => {
    const [first, second] = getDefaultValues(poResponse).items;
    expect(first.received_qty).toBe(13); // 8 + 5
    expect(second.received_qty).toBe(0); // ไม่มี pr_details
  });

  it("doc_version ของแถวเก็บแยกจากของหัวเอกสาร", () => {
    const values = getDefaultValues(poResponse);
    expect(values.doc_version).toBe(3);
    expect(values.items.map((i) => i.doc_version)).toEqual([1, 2]);
  });

  it("workflow กับเทอมเครดิตที่เป็น null กลายเป็นค่าว่าง ไม่ใช่ null ในฟอร์ม", () => {
    const values = getDefaultValues(poResponse);
    expect(values.workflow_id).toBe("");
    expect(values.credit_term_id).toBe("");
    expect(values.credit_term_name).toBe("");
  });

  it("note ที่หัวเอกสารว่างเสมอ เพราะ response ใหม่ไม่ส่งมาแล้ว", () => {
    // ฟอร์มยังมีช่องนี้และส่งใน payload ได้ แต่โหลดกลับมาไม่ได้ —
    // ถ้าวันไหน backend ส่ง note กลับมา เทสต์นี้จะเตือนให้มาต่อสายให้ครบ
    expect(getDefaultValues(poResponse).note).toBe("");
  });
});

describe("mapItemToPayload ตาม payload ใหม่", () => {
  const itemOf = (index: number) => getDefaultValues(poResponse).items[index];

  it("ส่งคลังแบน ไม่มี locations[] ซ้อนอีกแล้ว", () => {
    const payload = mapItemToPayload(itemOf(0), 0) as unknown as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty("locations");
    expect(payload.location_id).toBe("loc-direct");
    expect(payload.location_code).toBe("2FO03");
    expect(payload.delivery_point_id).toBe("dp-1");
  });

  it("sequence นับจาก 1 ตามตำแหน่งในฟอร์ม ไม่ใช่ sequence_no ที่ backend ส่งมา", () => {
    expect(mapItemToPayload(itemOf(0), 0).sequence).toBe(1);
    expect(mapItemToPayload(itemOf(1), 1).sequence).toBe(2);
  });

  it("ยอดคำนวณจากราคาคูณจำนวนของแถวนั้น ไม่ได้ส่งค่าที่โหลดมาต่อ", () => {
    const item: PoFormValues["items"][number] = {
      ...itemOf(0),
      order_qty: 10,
      price: 100,
      discount_rate: 10,
      tax_rate: 7,
      is_discount_adjustment: false,
      is_tax_adjustment: false,
    };
    const payload = mapItemToPayload(item, 0);
    expect(payload.sub_total_price).toBe(1000);
    expect(payload.discount_amount).toBe(100);
    expect(payload.net_amount).toBe(900);
    expect(payload.tax_amount).toBe(63);
    expect(payload.total_price).toBe(963);
  });

  it("ยอดที่ override ไว้ถูกส่งตามที่กรอก ไม่ถูกคำนวณทับ", () => {
    const item: PoFormValues["items"][number] = {
      ...itemOf(0),
      order_qty: 10,
      price: 100,
      discount_rate: 10,
      discount_amount: 250,
      is_discount_adjustment: true,
      tax_rate: 7,
      tax_amount: 1,
      is_tax_adjustment: true,
    };
    const payload = mapItemToPayload(item, 0);
    expect(payload.discount_amount).toBe(250);
    expect(payload.net_amount).toBe(750);
    expect(payload.tax_amount).toBe(1);
    expect(payload.total_price).toBe(751);
  });

  it("pr_details ส่งกลับไปครบ ไม่ถูกยุบเป็นแค่ยอดรวม", () => {
    const payload = mapItemToPayload(itemOf(0), 0);
    expect(payload.pr_details).toHaveLength(2);
    expect(payload.pr_details.map((p) => p.pr_detail_id)).toEqual([
      "pr-detail-1",
      "pr-detail-2",
    ]);
  });

  it("doc_version ของแถวติดไปด้วยเมื่อมี และไม่มีคีย์นี้เลยเมื่อเป็นแถวใหม่", () => {
    expect(mapItemToPayload(itemOf(0), 0).doc_version).toBe(1);
    const fresh = { ...itemOf(0), doc_version: undefined };
    expect(mapItemToPayload(fresh, 0)).not.toHaveProperty("doc_version");
  });

  it("คลังที่ยังไม่เลือกส่งเป็น null ไม่ใช่สตริงว่าง", () => {
    const payload = mapItemToPayload(itemOf(1), 1);
    expect(payload.location_id).toBeNull();
    expect(payload.delivery_point_id).toBeNull();
  });
});
