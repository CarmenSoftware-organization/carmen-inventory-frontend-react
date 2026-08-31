import { describe, it, expect } from "vitest";
import { moduleList } from "@/constant/module-list";
import { WF_TYPE_OPTIONS } from "@/routes/system-admin/workflow/wf-filter-options";
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

  it("ค่าที่ลิงก์พาไปตรงกับตัวกรองบนหน้า workflow เป๊ะ", () => {
    // ต่างกันเมื่อไร = กดเมนูแล้วได้หน้าที่กรองด้วยค่าที่ตัวกรองไม่รู้จัก
    const linked = (workflow?.subModules ?? []).map((s) =>
      decodeURIComponent((s.search ?? "").replace("?workflow_type=", "")),
    );
    expect(linked).toEqual(WF_TYPE_OPTIONS.map((o) => o.value));
  });

  it("เมนูย่อยใช้ path เดียวกับตัวแม่ — แยกกันด้วย query อย่างเดียว", () => {
    for (const s of workflow?.subModules ?? []) {
      expect(s.path).toBe("/system-admin/workflow");
      expect(s.search?.startsWith("?workflow_type=")).toBe(true);
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
