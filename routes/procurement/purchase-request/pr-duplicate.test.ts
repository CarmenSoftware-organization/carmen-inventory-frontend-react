import { describe, it, expect } from "vitest";
import { getDefaultValues, getDuplicateValues } from "./pr-form-schema";
import { isoToDateInput } from "@/lib/date-utils";
import type {
  PurchaseRequest,
  PurchaseRequestTemplate,
} from "@/types/purchase-request";

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

/** เทมเพลตเท่าที่ getDefaultValues อ่านจริง */
const template = {
  workflow_id: "wf-1",
  department_id: "dept-1",
  purchase_request_template_detail: [
    {
      product_id: "prd-1",
      product_name: "Oseki Sake 1.8L",
      requested_qty: 10,
    },
  ],
} as unknown as PurchaseRequestTemplate;

function expectTomorrow(items: { delivery_date: string }[]) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const expected = isoToDateInput(tomorrow.toISOString());
  for (const item of items) {
    expect(isoToDateInput(item.delivery_date)).toBe(expected);
  }
}

describe("getDuplicateValues", () => {
  it("ตั้ง delivery_date ของทุกแถวเป็นพรุ่งนี้ ไม่ใช่วันของใบเดิม", () => {
    const values = getDuplicateValues(source);

    expect(values.items).toHaveLength(2);
    expectTomorrow(values.items);
  });
});

describe("getDefaultValues จากเทมเพลต", () => {
  it("ตั้ง delivery_date เป็นพรุ่งนี้เหมือนกัน", () => {
    const values = getDefaultValues(undefined, template);

    expect(values.items).toHaveLength(1);
    expectTomorrow(values.items);
  });
});
