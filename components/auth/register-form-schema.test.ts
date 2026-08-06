import { describe, it, expect } from "vitest";
import {
  createRegisterSchema,
  EMPTY_REGISTER_FORM,
  USERNAME_MIN_LENGTH,
} from "./register-form-schema";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-schema";

const tv = ((k: string) => k) as never;
const tf = ((k: string) => k) as never;

const schema = createRegisterSchema(tv, tf);

const VALID = {
  firstName: "Somchai",
  lastName: "Jaidee",
  username: "somchai",
  email: "somchai@hotel.co.th",
  telephone: "0812345678",
  password: "Carmen#2026",
  confirm_password: "Carmen#2026",
};

/** คืน path ของ field ที่ error เพื่อไม่ต้องผูกกับข้อความแปล */
const errorPaths = (values: Record<string, unknown>): string[] => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => String(i.path[0]));
};

describe("register-form-schema", () => {
  it("accepts a complete form", () => {
    expect(schema.safeParse(VALID).success).toBe(true);
  });

  it("treats telephone as optional", () => {
    expect(schema.safeParse({ ...VALID, telephone: "" }).success).toBe(true);
  });

  it("requires every other field", () => {
    // EMPTY_REGISTER_FORM ต้องไม่ผ่าน ไม่งั้นฟอร์มเปล่าๆ ยิงขึ้น backend ได้
    expect(new Set(errorPaths(EMPTY_REGISTER_FORM))).toEqual(
      new Set(["firstName", "lastName", "username", "email", "password", "confirm_password"]),
    );
  });

  it("rejects a username shorter than the minimum", () => {
    const short = "a".repeat(USERNAME_MIN_LENGTH - 1);
    expect(errorPaths({ ...VALID, username: short })).toEqual(["username"]);
  });

  it("rejects a malformed email", () => {
    expect(errorPaths({ ...VALID, email: "somchai.hotel" })).toEqual(["email"]);
  });

  it("trims whitespace off the text fields", () => {
    const parsed = schema.parse({ ...VALID, firstName: "  Somchai  " });
    expect(parsed.firstName).toBe("Somchai");
  });

  it("flags a confirmation that does not match", () => {
    expect(
      errorPaths({ ...VALID, confirm_password: "Carmen#2027" }),
    ).toEqual(["confirm_password"]);
  });
});

describe("register-form-schema — password policy (shared with change password)", () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["too short", "Ab#1" + "x".repeat(PASSWORD_MIN_LENGTH - 5)],
    ["no uppercase", "carmen#2026"],
    ["no lowercase", "CARMEN#2026"],
    ["no number", "CarmenPass#"],
    ["no special character", "Carmen2026"],
  ];

  for (const [label, password] of cases) {
    it(`rejects a password with ${label}`, () => {
      expect(
        errorPaths({ ...VALID, password, confirm_password: password }),
      ).toContain("password");
    });
  }

  it("accepts one that satisfies every rule", () => {
    expect(schema.safeParse(VALID).success).toBe(true);
  });
});
