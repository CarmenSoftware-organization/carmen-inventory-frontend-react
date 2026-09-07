import { describe, it, expect } from "vitest";
import { buildRolePatch, getDefaultValues } from "./user-roles-form-schema";
import type { UserDetail } from "@/types/user";

/**
 * `PATCH /config/{bu}/user-application-roles` รับ diff ไม่ใช่ทั้งชุด — ส่งผิดฝั่ง
 * ทีเดียวคือผู้ใช้ได้สิทธิ์ที่ไม่ควรได้ ไม่มี typecheck ตัวไหนจับได้เพราะทั้งสอง
 * ฟิลด์เป็น `string[]` เหมือนกัน
 */
describe("buildRolePatch", () => {
  it("ติ๊กเพิ่มเข้า add เอาออกเข้า remove ไม่ปนกัน", () => {
    expect(buildRolePatch(["a", "b"], ["b", "c"])).toEqual({
      add: ["c"],
      remove: ["a"],
    });
  });

  it("บทบาทที่ไม่ได้แตะต้องไม่โผล่ทั้งสองฝั่ง", () => {
    const patch = buildRolePatch(["a", "b", "c"], ["a", "b", "c"]);
    expect(patch).toEqual({ add: [], remove: [] });
  });

  it("ยังไม่มีบทบาทเลยแล้วติ๊กใหม่ = add อย่างเดียว", () => {
    expect(buildRolePatch([], ["a", "b"])).toEqual({
      add: ["a", "b"],
      remove: [],
    });
  });

  it("เอาออกหมด = remove อย่างเดียว", () => {
    expect(buildRolePatch(["a", "b"], [])).toEqual({
      add: [],
      remove: ["a", "b"],
    });
  });

  it("ลำดับที่สลับไม่นับเป็นการเปลี่ยน", () => {
    expect(buildRolePatch(["a", "b"], ["b", "a"])).toEqual({
      add: [],
      remove: [],
    });
  });
});

describe("getDefaultValues", () => {
  it("อ่าน role_ids จาก application_role_id ไม่ใช่ id ของแถวเชื่อม", () => {
    const user = {
      application_roles: [
        { application_role_id: "role-1" },
        { application_role_id: "role-2" },
      ],
    } as UserDetail;
    expect(getDefaultValues(user)).toEqual({
      role_ids: ["role-1", "role-2"],
    });
  });
});
