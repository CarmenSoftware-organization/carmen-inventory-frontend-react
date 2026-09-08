import { describe, it, expect } from "vitest";
import { moduleList } from "@/constant/module-list";
import { WORKFLOW_DOC_TYPES, WORKFLOW_LIST_HOOKS } from "@/hooks/use-workflow";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import th from "@/messages/th.json";
import en from "@/messages/en.json";

const findLeaf = (path: string) => {
  for (const mod of moduleList)
    for (const sub of mod.subModules ?? []) if (sub.path === path) return sub;
  return undefined;
};

describe("เมนูย่อยของ workflow", () => {
  const workflow = findLeaf("/system-admin/workflow");

  it("มีเมนูย่อยครบสามชนิดใบ", () => {
    expect(workflow?.subModules?.map((s) => s.name)).toEqual([
      "workflowPurchaseRequest",
      "workflowPurchaseOrder",
      "workflowStoreRequisition",
    ]);
  });

  it("path ของเมนูย่อยลงท้ายด้วย slug ที่ endpoint รู้จัก", () => {
    // slug เพี้ยนเมื่อไร = ยิง GET /config/{bu}/workflows/<ผิด> แล้วได้ 404
    const slugs = (workflow?.subModules ?? []).map((s) =>
      s.path.replace("/system-admin/workflow/", ""),
    );
    expect(slugs).toEqual([...WORKFLOW_DOC_TYPES]);
  });

  it("เมนูย่อยเป็น route ของตัวเอง ซ้อนอยู่ใต้ path ของตัวแม่", () => {
    for (const s of workflow?.subModules ?? []) {
      expect(s.path.startsWith("/system-admin/workflow/")).toBe(true);
    }
  });

  it("เมนูย่อยสืบสิทธิ์และ license feature จากตัวแม่ ไม่ตกหล่น", () => {
    for (const s of workflow?.subModules ?? []) {
      expect(s.permission).toBe(workflow?.permission);
      expect(s.licenseFeature).toBe(workflow?.licenseFeature);
    }
  });

  it("ทุกชื่อเมนูมีคำแปลทั้ง th และ en", () => {
    for (const s of workflow?.subModules ?? []) {
      expect(
        (th.modules as Record<string, string>)[s.name],
        s.name,
      ).toBeTruthy();
      expect(
        (en.modules as Record<string, string>)[s.name],
        s.name,
      ).toBeTruthy();
    }
  });
});

describe("endpoint ของแต่ละชนิด", () => {
  it("path ที่ยิงจริงตรงกับที่ backend เปิดไว้", () => {
    // ผูกกับสตริงเต็ม ๆ ไม่ใช่แค่ slug — ย้ายโฟลเดอร์ config/ ไปที่อื่นแล้ว
    // เทสต์ต้องแดง ไม่ใช่ปล่อยให้ไปเจอ 404 ตอนกดเมนู
    expect(API_ENDPOINTS.WORKFLOWS_BY_DOC_TYPE("BU1", "purchase-request")).toBe(
      "/api/proxy/api/config/BU1/workflows/purchase-request",
    );
    for (const slug of WORKFLOW_DOC_TYPES) {
      expect(API_ENDPOINTS.WORKFLOWS_BY_DOC_TYPE("BU1", slug)).toBe(
        `/api/proxy/api/config/BU1/workflows/${slug}`,
      );
    }
  });

  it("ทุกชนิดมี list hook ของตัวเอง", () => {
    for (const slug of WORKFLOW_DOC_TYPES) {
      expect(WORKFLOW_LIST_HOOKS[slug], slug).toBeTypeOf("function");
    }
  });
});
