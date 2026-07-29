import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { ApiError, ERROR_CODES } from "./api-error";
import { getUserErrorMessage } from "./error-message";

// t(key) → key, so assertions read as the i18n key that would be shown
const t = (key: string) => key;

const apiError = (
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  { status, serverMessage }: { status?: number; serverMessage?: string } = {},
) =>
  new ApiError(code, "dev fallback", status, false, undefined, serverMessage);

describe("getUserErrorMessage", () => {
  it.each([
    [ERROR_CODES.UNAUTHORIZED, "sessionExpired"],
    [ERROR_CODES.SESSION_EXPIRED, "sessionExpired"],
    [ERROR_CODES.FORBIDDEN, "noPermission"],
    [ERROR_CODES.NOT_FOUND, "notFound"],
    [ERROR_CODES.RATE_LIMITED, "tooFast"],
    [ERROR_CODES.TIMEOUT, "timeout"],
    [ERROR_CODES.NETWORK_ERROR, "network"],
    [ERROR_CODES.BACKEND_UNAVAILABLE, "serverDown"],
    [ERROR_CODES.INTERNAL_ERROR, "serverDown"],
  ])("%s → errors.%s", (code, key) => {
    expect(getUserErrorMessage(apiError(code), t)).toBe(key);
  });

  it("falls back to errors.unexpected for a non-ApiError", () => {
    expect(getUserErrorMessage(new Error("boom"), t)).toBe("unexpected");
    expect(getUserErrorMessage("just a string", t)).toBe("unexpected");
  });

  // Regression guard: `message` is the dev's hardcoded English string
  // ("Failed to create location") — never show it just because it is there.
  it("uses the generic line when the backend said nothing", () => {
    const err = apiError(ERROR_CODES.VALIDATION_ERROR, { status: 400 });
    expect(err.message).toBe("dev fallback");
    expect(getUserErrorMessage(err, t)).toBe("invalidForm");
  });

  it("keeps errors.missingField for the code that means exactly that", () => {
    const err = apiError(ERROR_CODES.MISSING_REQUIRED_FIELD, { status: 400 });
    expect(getUserErrorMessage(err, t)).toBe("missingField");
  });

  // ─── ข้อความจาก server ไม่ถูกส่งต่อให้ผู้ใช้ ─────────────────────────────
  // ของจริงที่เจอ: backend ส่ง stack trace ของ Prisma กลับมาทั้งดุ้นใน 400
  const PRISMA_LEAK =
    "1479 }\\n  1480 const now = new Date().toISOString();\\n  1481 await this.prismaService.$transaction(async (prisma)=>{\\n→ 1482     await prisma.tb_purchase_request_detail.updateMany(\nUnique constraint failed on the fields: (purchase_request_id, product_id, location_id, dimension, deleted_at)";

  it.each([
    PRISMA_LEAK,
    "Unique constraint failed on the fields: (code, deleted_at)",
    "at Object.handler (/app/src/pr.service.ts:1482)",
    "รหัสนี้ถูกใช้แล้ว",
  ])("uses our own wording instead of the backend message", (raw) => {
    const err = apiError(ERROR_CODES.VALIDATION_ERROR, {
      status: 400,
      serverMessage: raw,
    });
    expect(getUserErrorMessage(err, t)).toBe("invalidForm");
  });

  it("says the document changed on a 409, not that the form is wrong", () => {
    const err = apiError(ERROR_CODES.VALIDATION_ERROR, { status: 409 });
    expect(getUserErrorMessage(err, t)).toBe("documentChanged");
  });

  it("never leaks a 5xx server message", () => {
    const err = apiError(ERROR_CODES.INTERNAL_ERROR, {
      status: 500,
      serverMessage: "NullPointerException at OrderService.java:412",
    });
    expect(getUserErrorMessage(err, t)).toBe("serverDown");
  });
});

describe("every code maps to a key that both locales define", () => {
  it.each(Object.values(ERROR_CODES))("%s", (code) => {
    const key = getUserErrorMessage(apiError(code), t);
    expect(en.errors, `en.errors.${key}`).toHaveProperty(key);
    expect(th.errors, `th.errors.${key}`).toHaveProperty(key);
  });
});
