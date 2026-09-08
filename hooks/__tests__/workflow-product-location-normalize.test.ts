import { describe, it, expect } from "vitest";
import { normalizeWorkflowProductLocation } from "../use-locations-by-product";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { INVENTORY_TYPE } from "@/constant/location";

/**
 * แถวตามที่ backend ระบุไว้สำหรับ
 * `GET /api/config/{bu}/workflows/{wf}/products/{product}/locations`
 * — ฟิลด์ขึ้นต้น `location_` ทั้งชุด ไม่ใช่ `id`/`code`/`name` เหมือน `Location` ปกติ
 */
const ROW = {
  location_id: "47414c16-9d52-4b16-8428-4a4c4e89986e",
  location_code: "1AG01",
  location_name: "A&G-Accounting",
  location_type: INVENTORY_TYPE.INVENTORY,
  is_active: true,
};

describe("normalizeWorkflowProductLocation", () => {
  /**
   * ค่านี้ถูกเขียนลง `items[].locations[].id` แล้วส่งขึ้น backend ตอนบันทึก PO
   * หยิบผิดฟิลด์จะได้ undefined แล้ว lookup โล่งเงียบ ๆ ไม่มี error ให้เห็น
   */
  it("ย้าย location_id มาเป็น id", () => {
    expect(normalizeWorkflowProductLocation(ROW).id).toBe(ROW.location_id);
  });

  it("ถอด prefix location_ ออกจาก code/name", () => {
    const loc = normalizeWorkflowProductLocation(ROW);
    expect(loc.code).toBe("1AG01");
    expect(loc.name).toBe("A&G-Accounting");
  });

  it("เก็บ location_type กับ is_active ไว้ตามเดิม", () => {
    const loc = normalizeWorkflowProductLocation(ROW);
    expect(loc.location_type).toBe(INVENTORY_TYPE.INVENTORY);
    expect(loc.is_active).toBe(true);
  });
});

describe("LOCATIONS_BY_WORKFLOW_PRODUCT", () => {
  /**
   * ลำดับ argument สลับกันแล้ว URL ยังถูก type — ทั้งสามตัวเป็น string
   * ต้องมีเทสต์ตรึงรูป path ไว้
   */
  it("เรียง bu → workflow → product ตามสัญญาของ backend", () => {
    expect(
      API_ENDPOINTS.LOCATIONS_BY_WORKFLOW_PRODUCT("BU1", "WF2", "P3"),
    ).toBe("/api/proxy/api/config/BU1/workflows/WF2/products/P3/locations");
  });
});
