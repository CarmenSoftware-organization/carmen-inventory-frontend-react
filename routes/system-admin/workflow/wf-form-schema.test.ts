import { describe, it, expect } from "vitest";
import {
  WorkflowDataParseError,
  getWorkflowFormDefaults,
  parseWorkflowData,
  toWorkflowPayload,
} from "./wf-form-schema";
import type { Workflow } from "@/types/workflows";

/** stage รูปแบบเก่า — recipients เป็น boolean ล้วน (row ที่บันทึกไว้ก่อน migrate) */
const legacyStage = {
  name: "Create Request",
  description: "",
  sla: "24",
  sla_unit: "hours",
  role: "create",
  creator_access: "only_creator",
  available_actions: {
    submit: {
      is_active: true,
      recipients: { requestor: true, current_approve: false, next_step: true },
    },
    approve: {
      is_active: false,
      recipients: { requestor: false, current_approve: false, next_step: false },
    },
    reject: {
      is_active: false,
      recipients: { requestor: false, current_approve: false, next_step: false },
    },
    sendback: {
      is_active: false,
      recipients: { requestor: false, current_approve: false, next_step: false },
    },
  },
  hide_fields: { price_per_unit: false, total_price: false },
  assigned_users: [],
};

const workflowWith = (data: unknown): Workflow =>
  ({
    id: "0adbbd4c-eab7-497b-a0af-70a3bc662be7",
    name: "General PR",
    workflow_type: "purchase_request",
    is_active: true,
    description: null,
    data,
  }) as unknown as Workflow;

const legacyData = {
  document_reference_pattern: "PR-{YYYY}-{MM}-{####}",
  stages: [legacyStage],
  routing_rules: [],
  notifications: [],
  notification_templates: [],
  products: [],
};

describe("parseWorkflowData", () => {
  it("รับ recipients แบบ boolean เก่าแล้วแปลงเป็น object shape ใหม่", () => {
    const parsed = parseWorkflowData(legacyData);
    expect(parsed.success).toBe(true);

    const recipients =
      parsed.data!.stages[0].available_actions.submit.recipients;
    expect(recipients.requestor.is_active).toBe(true);
    expect(recipients.current_approve.is_active).toBe(false);
    expect(recipients.requestor.notification_channel.app.is_active).toBe(true);
  });

  it("ของที่แปลงแล้วยังผ่าน schema ซ้ำได้ (ของใหม่ไม่พัง)", () => {
    const once = parseWorkflowData(legacyData);
    expect(parseWorkflowData(once.data).success).toBe(true);
  });
});

describe("products", () => {
  const fullSnapshotProduct = {
    id: "6a1f0c1e-0000-0000-0000-000000000001",
    code: "P-0001",
    name: "Rice",
    inventory_unit: { id: "u1", name: "KG" },
    product_category: { id: "c1", name: "Dry Goods" },
  };

  it("อ่านได้ทั้ง snapshot เต็มแบบเก่าและ id ล้วนแบบใหม่ — normalize เป็น { id, ... }", () => {
    const parsed = parseWorkflowData({
      ...legacyData,
      products: [fullSnapshotProduct, "6a1f0c1e-0000-0000-0000-000000000002"],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data!.products.map((p) => p.id)).toEqual([
      "6a1f0c1e-0000-0000-0000-000000000001",
      "6a1f0c1e-0000-0000-0000-000000000002",
    ]);
    // snapshot เก่ายังเก็บ field เดิมไว้ (ใช้ fallback ตอน join master ไม่เจอ)
    expect(parsed.data!.products[0].product_category?.name).toBe("Dry Goods");
  });

  it("toWorkflowPayload หั่น products เหลือ id ล้วนก่อนส่ง", () => {
    const defaults = getWorkflowFormDefaults(
      workflowWith({ ...legacyData, products: [fullSnapshotProduct] }),
    );
    const payload = toWorkflowPayload(defaults);
    expect(payload.data.products).toEqual([
      "6a1f0c1e-0000-0000-0000-000000000001",
    ]);
    // ส่วนอื่นไม่โดนแตะ
    expect(payload.data.stages).toHaveLength(1);
    expect(payload.name).toBe("General PR");
  });
});

describe("getWorkflowFormDefaults", () => {
  it("คง stages ของ row เก่าไว้ครบ", () => {
    const defaults = getWorkflowFormDefaults(workflowWith(legacyData));
    expect(defaults.data.stages).toHaveLength(1);
    expect(defaults.data.stages[0].name).toBe("Create Request");
  });

  it("throw เมื่ออ่าน data ไม่ได้ — ห้ามคืนค่าว่างให้เอาไป PUT ทับ", () => {
    expect(() =>
      getWorkflowFormDefaults(workflowWith({ stages: "ไม่ใช่ array" })),
    ).toThrow(WorkflowDataParseError);
  });
});
