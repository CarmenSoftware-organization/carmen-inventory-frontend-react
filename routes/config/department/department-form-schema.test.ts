import { describe, it, expect } from "vitest";
import {
  createDepartmentSchema,
  EMPTY_FORM,
  getDefaultValues,
} from "./department-form-schema";
import type { Department } from "@/types/department";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;

describe("department-form-schema — account_code", () => {
  it("EMPTY_FORM has an empty account_code", () => {
    expect(EMPTY_FORM.account_code).toBe("");
  });

  it("accepts an empty account_code (optional)", () => {
    const schema = createDepartmentSchema(tv, tf);
    const result = schema.safeParse({
      code: "D01",
      name: "Kitchen",
      description: "",
      is_active: true,
      account_code: "",
      department_users: { add: [], remove: [] },
      hod_users: { add: [], remove: [] },
    });
    expect(result.success).toBe(true);
  });

  it("getDefaultValues carries account_code from the entity", () => {
    const dept = {
      code: "D01",
      name: "Kitchen",
      description: "",
      is_active: true,
      account_code: "ACC-100",
      department_users: [],
      hod_users: [],
    } as unknown as Department;
    expect(getDefaultValues(dept).account_code).toBe("ACC-100");
  });
});
