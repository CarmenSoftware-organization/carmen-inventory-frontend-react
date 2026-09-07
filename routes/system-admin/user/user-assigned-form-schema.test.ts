import { describe, it, expect } from "vitest";
import {
  buildIdPatch,
  buildUserPatch,
  getDefaultValues,
  type UserAssignedFormValues,
} from "./user-assigned-form-schema";
import type { UserDetail } from "@/types/user";

/**
 * `PATCH /config/{bu}/users/{id}` รับ diff ไม่ใช่ทั้งชุด — ส่งผิดฝั่งทีเดียวคือ
 * ผู้ใช้ได้สิทธิ์ที่ไม่ควรได้ ไม่มี typecheck ตัวไหนจับได้เพราะทั้งสองฟิลด์เป็น
 * `string[]` เหมือนกัน
 */
describe("buildIdPatch", () => {
  it("ติ๊กเพิ่มเข้า add เอาออกเข้า remove ไม่ปนกัน", () => {
    expect(buildIdPatch(["a", "b"], ["b", "c"])).toEqual({
      add: ["c"],
      remove: ["a"],
    });
  });

  it("ของที่ไม่ได้แตะต้องไม่โผล่ทั้งสองฝั่ง", () => {
    expect(buildIdPatch(["a", "b", "c"], ["a", "b", "c"])).toEqual({
      add: [],
      remove: [],
    });
  });

  it("ยังไม่มีอะไรเลยแล้วติ๊กใหม่ = add อย่างเดียว", () => {
    expect(buildIdPatch([], ["a", "b"])).toEqual({
      add: ["a", "b"],
      remove: [],
    });
  });

  it("เอาออกหมด = remove อย่างเดียว", () => {
    expect(buildIdPatch(["a", "b"], [])).toEqual({
      add: [],
      remove: ["a", "b"],
    });
  });

  it("ลำดับที่สลับไม่นับเป็นการเปลี่ยน", () => {
    expect(buildIdPatch(["a", "b"], ["b", "a"])).toEqual({
      add: [],
      remove: [],
    });
  });
});

describe("getDefaultValues", () => {
  it("อ่าน id ของตัวจริง ไม่ใช่ id ของแถวเชื่อม", () => {
    const user = {
      application_roles: [
        { id: "map-1", application_role_id: "role-1" },
        { id: "map-2", application_role_id: "role-2" },
      ],
      locations: [
        { id: "map-3", location_id: "loc-1" },
        { id: "map-4", location_id: "loc-2" },
      ],
      department: { id: "dept-1", name: "Front Office" },
    } as UserDetail;

    expect(getDefaultValues(user)).toEqual({
      role_ids: ["role-1", "role-2"],
      location_ids: ["loc-1", "loc-2"],
      department_id: "dept-1",
    });
  });

  it("ไม่สังกัดแผนก = ช่องว่าง ไม่ใช่ undefined (ไม่งั้น RHF หาว่า uncontrolled)", () => {
    const user = {
      application_roles: [],
      locations: [],
      department: null,
    } as unknown as UserDetail;

    expect(getDefaultValues(user).department_id).toBe("");
  });
});

const base: UserAssignedFormValues = {
  role_ids: ["role-1"],
  location_ids: ["loc-1"],
  department_id: "dept-1",
};

/**
 * field ที่ไม่ได้แตะต้องไม่โผล่ใน body เลย — คลังของผู้ใช้แก้ได้จาก
 * `/config/location` ด้วย ส่งทับทุกครั้งคือลบของที่คนอื่นเพิ่งเพิ่ม
 */
describe("buildUserPatch", () => {
  it("ไม่มีอะไรเปลี่ยน = null ไม่ต้องยิง API", () => {
    expect(buildUserPatch(base, { ...base })).toBeNull();
  });

  it("แตะแค่บทบาท = body มีแค่ application_role_id", () => {
    const patch = buildUserPatch(base, { ...base, role_ids: ["role-2"] });
    expect(patch).toEqual({
      application_role_id: { add: ["role-2"], remove: ["role-1"] },
    });
  });

  it("แตะแค่คลัง = body มีแค่ location_id", () => {
    const patch = buildUserPatch(base, {
      ...base,
      location_ids: ["loc-1", "loc-2"],
    });
    expect(patch).toEqual({
      location_id: { add: ["loc-2"], remove: [] },
    });
  });

  it("ย้ายแผนก = ส่ง department_id ตัวเดียว ไม่ใช่ add/remove", () => {
    expect(buildUserPatch(base, { ...base, department_id: "dept-2" })).toEqual({
      department_id: "dept-2",
    });
  });

  it("ถอดออกจากแผนก = ส่งค่าว่างไป ไม่ใช่ข้ามไปเฉย ๆ", () => {
    expect(buildUserPatch(base, { ...base, department_id: "" })).toEqual({
      department_id: "",
    });
  });

  it("เปลี่ยนหลายอย่างพร้อมกัน = มาครบในก้อนเดียว", () => {
    const patch = buildUserPatch(base, {
      role_ids: ["role-2"],
      location_ids: [],
      department_id: "dept-2",
    });
    expect(patch).toEqual({
      application_role_id: { add: ["role-2"], remove: ["role-1"] },
      location_id: { add: [], remove: ["loc-1"] },
      department_id: "dept-2",
    });
  });
});
