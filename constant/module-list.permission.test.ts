import { describe, it, expect } from "vitest";
import { moduleList, type ModuleDto } from "./module-list";

/**
 * เทสต์กันการกลับมาของบั๊ก "เมนูคุมด้วย permission ระดับ module"
 *
 * role จริงได้ permission ระดับ resource (`inventory_management.stock_in.create`,
 * `operation_plan.recipe.view` …) ส่วน endpoint ของแต่ละหน้าที่ backend บังคับก็เป็นระดับ
 * resource (`permission.route-map.ts`: `app:inventory-adjustments` →
 * `inventory_management.inventory_adjustment`) — แต่ 11 leaf เคยถูกคุมด้วยคีย์ระดับ module
 * (`product_management.view` / `vendor_management.view` / `operation_plan.view` /
 * `inventory_management.view`) ซึ่งมีอยู่ใน tb_permission แต่ไม่มี API ไหนตรวจ ผลคือต้องถือ
 * **ทั้งสองคีย์** ถึงจะใช้หน้าได้: role ที่ได้แค่คีย์ระดับ resource (บัญชี fc ของ CARMEN-AVG
 * ที่มี stock_in/out + inventory_adjustment ครบ) เปิด Inventory Adjustment แล้วเจอ
 * Permission Denied (เจอจาก e2e เมื่อ 2026-10-02)
 *
 * admin ข้ามด่าน permission ทั้งหมด (`RouteGuard` เช็ค `isAdmin` ก่อน) บั๊กนี้จึงมองไม่เห็นเลย
 * ถ้าทดสอบด้วย admin
 */

function leaves(mods: ModuleDto[] = moduleList): ModuleDto[] {
  return mods.flatMap((m) =>
    m.subModules && m.subModules.length > 0 ? leaves(m.subModules) : [m],
  );
}

describe("moduleList → permission ของ leaf", () => {
  it("ทุก leaf ที่ระบุ permission ต้องเป็นคีย์ระดับ resource (`namespace.resource.action`)", () => {
    const moduleLevel = leaves()
      .filter((leaf) => leaf.permission !== undefined)
      .map((leaf) => ({
        path: leaf.path,
        permission: leaf.permission as string,
      }))
      .filter((x) => x.permission.split(".").length < 3);

    expect(moduleLevel).toEqual([]);
  });
});
