import { describe, it, expect } from "vitest";
import {
  buildSrDefaultValues,
  buildSrDuplicateValues,
  srStockVisible,
} from "./sr-form-helpers";
import type { StoreRequisition } from "@/types/store-requisition";

/** ตัดมาจาก response จริงของ GET /store-requisitions/:id (เอาเฉพาะที่ฟอร์มใช้) */
const sr = {
  id: "5f0b1b3e-2f0a-4a34-9b0a-3d2a1c4e5f60",
  sr_no: "SR260600012",
  sr_type: "transfer",
  sr_date: "2026-06-11T00:00:00.000Z",
  expected_date: "2026-06-12T00:00:00.000Z",
  description: "เบิกของเข้าครัว",
  doc_status: "in_progress",
  doc_version: 3,
  workflow_id: "8c1d6a7e-0000-4d55-9f1a-b0c9d8e7f612",
  requestor_id: "a1b2c3d4-1111-4222-8333-444455556666",
  department_id: "d1e2f3a4-7777-4888-8999-000011112222",
  from_location_id: "loc-from",
  to_location_id: "loc-to",
  store_requisition_detail: [
    {
      id: "detail-1",
      doc_version: 2,
      product_id: "prod-1",
      product_name: "Coca-Cola 325ml",
      product_local_name: "โค้ก 325 มล.",
      inventory_unit_name: "CAN",
      description: "",
      requested_qty: 24,
      approved_qty: 20,
      issued_qty: 18,
      current_stage_status: "approve",
      history: [{ seq: 1 }],
    },
  ],
} as unknown as StoreRequisition;

const REQUESTOR = "me-user-id";
const DEPARTMENT = "my-department-id";

describe("buildSrDefaultValues", () => {
  it("ไม่มีใบ = ฟอร์มเปล่า วันคาดว่าได้รับเป็นวันรุ่งขึ้นของวันที่ใบ", () => {
    const values = buildSrDefaultValues(undefined, REQUESTOR, DEPARTMENT);
    expect(values.items).toEqual([]);
    expect(values.workflow_id).toBe("");
    expect(values.requestor_id).toBe(REQUESTOR);
    expect(values.department_id).toBe(DEPARTMENT);

    const gap =
      new Date(values.expected_date).getTime() -
      new Date(values.sr_date).getTime();
    expect(gap).toBe(24 * 60 * 60 * 1000);
  });

  it("มีใบ = แปลง detail เป็นแถวฟอร์ม พร้อม snapshot สถานะจาก server", () => {
    const values = buildSrDefaultValues(sr, REQUESTOR, DEPARTMENT);
    expect(values.doc_version).toBe(3);
    expect(values.items).toHaveLength(1);

    const item = values.items[0];
    expect(item.id).toBe("detail-1");
    expect(item.unit_name).toBe("CAN");
    expect(item.approved_qty).toBe(20);
    expect(item.issued_qty).toBe(18);
    // stage_status เริ่มว่างเสมอ = "รอบนี้ยังไม่ได้ตัดสินอะไร"
    expect(item.stage_status).toBe("");
    // ส่วน _initial_ คือของที่ server ส่งมา ใช้ล็อกปุ่มล้างสถานะ
    expect(item._initial_stage_status).toBe("approve");
    expect(item.history).toHaveLength(1);
  });
});

describe("buildSrDuplicateValues", () => {
  const values = buildSrDuplicateValues(sr, REQUESTOR, DEPARTMENT);

  it("ก๊อปของที่เบิก แต่ไม่ก๊อปตัวตนของใบเดิม", () => {
    expect(values.description).toBe("เบิกของเข้าครัว");
    expect(values.workflow_id).toBe(sr.workflow_id);
    expect(values.from_location_id).toBe("loc-from");
    expect(values.to_location_id).toBe("loc-to");
    expect(values.doc_version).toBeUndefined();
  });

  it("คนกดก๊อปเป็นผู้ขอคนใหม่ วันที่เริ่มนับใหม่", () => {
    const blank = buildSrDefaultValues(undefined, REQUESTOR, DEPARTMENT);
    expect(values.requestor_id).toBe(REQUESTOR);
    expect(values.sr_date).not.toBe(sr.sr_date);
    expect(values.sr_date.slice(0, 10)).toBe(blank.sr_date.slice(0, 10));
  });

  it("รายการติดไปแค่สินค้ากับจำนวนที่ขอ — ที่เหลือเริ่มรอบใหม่", () => {
    const item = values.items[0];
    expect(item.product_id).toBe("prod-1");
    expect(item.requested_qty).toBe(24);
    expect(item.id).toBeUndefined();
    expect(item.doc_version).toBeUndefined();
    expect(item.approved_qty).toBe(0);
    expect(item.issued_qty).toBe(0);
    expect(item.current_stage_status).toBe("pending");
    expect(item._initial_stage_status).toBe("pending");
    expect(item.history).toBeUndefined();
  });
});

describe("srStockVisible", () => {
  it("เห็นการเคลื่อนไหวสต๊อกได้เฉพาะใบที่ปิดจบแล้ว", () => {
    expect(srStockVisible("completed")).toBe(true);
  });

  it("ก่อนถึง completed ตัวเลขยังเป็นการคาดการณ์ — ไม่โชว์", () => {
    for (const status of [
      undefined,
      "",
      "draft",
      "in_progress",
      "cancelled",
      "voided",
    ]) {
      expect(srStockVisible(status)).toBe(false);
    }
  });
});
