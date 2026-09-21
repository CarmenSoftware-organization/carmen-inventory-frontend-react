import { describe, it, expect } from "vitest";
import { createTranslator } from "use-intl";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import { ApiError, ERROR_CODES } from "./api-error";
import { FIELD_TO_KEY, getUserErrorMessage } from "./error-message";

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

// รหัสจาก error catalog ต้องชนะข้อความกลาง — ไม่งั้นเหตุผลที่ผู้ใช้แก้เองได้จะถูกกลบ
describe("app code mapping", () => {
  it("uses the specific message when the backend names a code the user can act on", () => {
    const err = new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Some document in workflow is in_progress",
      400,
      false,
      undefined,
      "Some document in workflow is in_progress",
      "WORKFLOW_HAS_IN_PROGRESS_DOCUMENTS",
    );

    expect(getUserErrorMessage(err, t)).toBe("workflowInProgress");
  });

  // 422 ก็ต้องเข้าทางเดียวกับ 400 — statusToCode() โยนทั้งคู่ไป VALIDATION_ERROR
  // (ใบเบิกนอกงวดบัญชีเป็น 422 ของจริงจาก backend)
  it("maps an app code that arrives with a 422", () => {
    const err = new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "The requisition date does not fall inside any open period",
      422,
      false,
      undefined,
      "The requisition date does not fall inside any open period",
      "SR_DATE_OUTSIDE_OPEN_PERIOD",
    );

    expect(getUserErrorMessage(err, t)).toBe("srDateOutsideOpenPeriod");
  });

  // รหัสที่ยังไม่ได้ map ต้องตกไปที่ข้อความกลางตามเดิม ไม่ใช่พังหรือโชว์รหัสดิบ
  it("falls back to the generic message for a code that is not mapped", () => {
    const err = new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "boom",
      400,
      false,
      undefined,
      "boom",
      "SOME_INTERNAL_CODE",
    );

    expect(getUserErrorMessage(err, t)).toBe("invalidForm");
  });

  it("still falls back when there is no code at all", () => {
    const err = new ApiError(ERROR_CODES.VALIDATION_ERROR, "boom", 400);

    expect(getUserErrorMessage(err, t)).toBe("invalidForm");
  });
});

// 400 validation ของ backend บอกชื่อ field มาด้วย แต่เป็น path ดิบ
// (`good_received_note_detail.add.0.received_price`) — ต้องแปลงเป็นชื่อช่องบนจอเสมอ
describe("field errors", () => {
  const tField = (key: string) => `field.${key}`;
  const withFields = (fields: string[]) =>
    new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Validation failed",
      400,
      false,
      undefined,
      "Validation failed",
      undefined,
      fields,
    );

  it("names the fields the backend rejected", () => {
    const err = withFields([
      "good_received_note_detail.add.0.received_price",
      "good_received_note_detail.add.1.received_qty",
    ]);

    expect(getUserErrorMessage(err, t, tField)).toBe("checkFields");
  });

  // ชื่อที่ยังไม่ได้ map ต้องไม่หลุดออกไปหน้าจอในรูป snake_case
  it("falls back to the generic message when no field is recognised", () => {
    const err = withFields(["tb_internal.some_column"]);

    expect(getUserErrorMessage(err, t, tField)).toBe("invalidForm");
  });

  // ไม่มีตัวแปลชื่อช่องส่งมา (call site เก่า) ต้องได้พฤติกรรมเดิมเป๊ะ
  it("keeps the old behaviour without a field translator", () => {
    const err = withFields(["good_received_note_detail.add.0.received_price"]);

    expect(getUserErrorMessage(err, t)).toBe("invalidForm");
  });

  it.each(Object.entries(FIELD_TO_KEY))("%s maps to a key both locales define", (_field, key) => {
    expect(en.field, `en.field.${key}`).toHaveProperty(key);
    expect(th.field, `th.field.${key}`).toHaveProperty(key);
  });
});

// รหัสจาก catalog ที่ไม่ได้อยู่ใน APP_CODE_TO_KEY ใช้คีย์ชื่อเดียวกับรหัสเลย
// (`errors.byCode.<CODE>`) — `t.has()` คือตัวตัดสินว่ามีข้อความให้ไหม ไม่มีก็ตกไป
// ข้อความกลาง ไม่ใช่โชว์ `errors.byCode.PO_XXX` ดิบ ๆ ออกหน้าจอ
describe("byCode messages", () => {
  const tHas = Object.assign((key: string) => key, {
    has: (key: string) =>
      key.startsWith("byCode.")
        ? key.slice("byCode.".length) in en.errors.byCode
        : key in en.errors,
  });

  const catalogError = (
    appCode: string,
    status: number,
    appParams?: Record<string, string | number>,
  ) =>
    new ApiError(
      status === 404 ? ERROR_CODES.NOT_FOUND : ERROR_CODES.VALIDATION_ERROR,
      "dev fallback",
      status,
      false,
      undefined,
      "backend message",
      appCode,
      undefined,
      appParams,
    );

  // 404 ที่บอกเหตุผลมาแล้วต้องไม่จบลงที่ "ไม่พบข้อมูล" — ของเดิม appCode ถูกอ่าน
  // เฉพาะใน branch ของ 400/422 เท่านั้น รหัส 404/403/500 จึงไม่เคยถูกใช้เลย
  it("beats the generic message on a 404", () => {
    expect(getUserErrorMessage(catalogError("PO_NOT_FOUND", 404), tHas)).toBe(
      "byCode.PO_NOT_FOUND",
    );
  });

  it("beats the generic message on a 403", () => {
    expect(
      getUserErrorMessage(catalogError("PR_DELETE_FORBIDDEN", 403), tHas),
    ).toBe("byCode.PR_DELETE_FORBIDDEN");
  });

  it("keeps APP_CODE_TO_KEY winning over the code-named key", () => {
    expect(
      getUserErrorMessage(catalogError("SR_DATE_OUTSIDE_OPEN_PERIOD", 422), tHas),
    ).toBe("srDateOutsideOpenPeriod");
  });

  it("falls back to the generic message for a code with no message", () => {
    expect(getUserErrorMessage(catalogError("PO_PR_IDS_REQUIRED", 400), tHas)).toBe(
      "invalidForm",
    );
  });

  // ข้อความที่มี placeholder ต้องได้ค่ามาจาก `body.params` ไม่งั้นผู้ใช้เห็น
  // "{blocked} จาก {total} ใบ" ทื่อ ๆ
  it("passes body.params through to the message", () => {
    const seen: Record<string, unknown>[] = [];
    const tSpy = Object.assign(
      (_key: string, values?: Record<string, string | number>) => {
        if (values) seen.push(values);
        return "ok";
      },
      { has: () => true },
    );
    getUserErrorMessage(
      catalogError("PO_BATCH_DELETE_BLOCKED", 400, { blocked: 2, total: 5 }),
      tSpy,
    );
    expect(seen).toEqual([{ blocked: 2, total: 5 }]);
  });

  it.each(Object.keys(en.errors.byCode))("%s exists in both locales", (code) => {
    expect(th.errors.byCode, `th.errors.byCode.${code}`).toHaveProperty(code);
  });

  it("has no message in th that en does not define", () => {
    expect(Object.keys(th.errors.byCode).sort()).toEqual(
      Object.keys(en.errors.byCode).sort(),
    );
  });
});

// `t.has()` เป็นของ use-intl ที่เรียกผ่าน optional chaining — หายไปเมื่อไหร่ byCode
// ทั้งชุดจะเงียบตกไปข้อความกลางโดยไม่มีเทสต์ไหนแดง (ตัว `t` ปลอมข้างบนมี has เอง)
describe("with the real use-intl translator", () => {
  it.each(["en", "th"] as const)("%s renders the message and its params", (locale) => {
    const t = createTranslator({
      locale,
      messages: locale === "en" ? en : th,
      namespace: "errors",
    });
    const err = new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "dev fallback",
      400,
      false,
      undefined,
      "backend message",
      "PO_BATCH_DELETE_BLOCKED",
      undefined,
      { blocked: 2, total: 5 },
    );

    const message = getUserErrorMessage(err, t as never);

    expect(message).toContain("2");
    expect(message).toContain("5");
    expect(message).not.toContain("byCode");
  });
});
