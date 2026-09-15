import { describe, it, expect } from "vitest";
import { getDuplicateValues } from "./pr-form-schema";
import { isoToDateInput } from "@/lib/date-utils";
import type { PurchaseRequest } from "@/types/purchase-request";

/** ใบต้นทางเท่าที่ getDuplicateValues อ่านจริง */
const source = {
  description: "ของประจำสัปดาห์",
  workflow_id: "wf-1",
  department_id: "dept-1",
  purchase_request_detail: [
    {
      product_id: "prd-1",
      product_name: "Oseki Sake 1.8L",
      requested_qty: 10,
      // วันส่งของใบเดิมเป็นอดีต — ต้องไม่ถูกลอกมา
      delivery_date: "2026-01-02T00:00:00.000Z",
    },
    { product_id: "prd-2", product_name: "SF Fiber", requested_qty: 1 },
  ],
} as unknown as PurchaseRequest;

describe("getDuplicateValues", () => {
  it("ตั้ง delivery_date ของทุกแถวเป็นพรุ่งนี้ ไม่ใช่วันของใบเดิม", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = isoToDateInput(tomorrow.toISOString());

    const values = getDuplicateValues(source);

    expect(values.items).toHaveLength(2);
    for (const item of values.items) {
      expect(isoToDateInput(item.delivery_date)).toBe(expected);
    }
  });
});
