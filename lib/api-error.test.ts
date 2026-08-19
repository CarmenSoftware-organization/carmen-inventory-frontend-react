import { describe, it, expect } from "vitest";
import { ApiError, ERROR_CODES, licenseErrorCodeFrom } from "./api-error";

describe("ERROR_CODES", () => {
  it("contains all expected error codes", () => {
    expect(ERROR_CODES).toEqual({
      UNAUTHORIZED: "UNAUTHORIZED",
      SESSION_EXPIRED: "SESSION_EXPIRED",
      FORBIDDEN: "FORBIDDEN",
      VALIDATION_ERROR: "VALIDATION_ERROR",
      MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
      NETWORK_ERROR: "NETWORK_ERROR",
      TIMEOUT: "TIMEOUT",
      BACKEND_UNAVAILABLE: "BACKEND_UNAVAILABLE",
      RATE_LIMITED: "RATE_LIMITED",
      INTERNAL_ERROR: "INTERNAL_ERROR",
      NOT_FOUND: "NOT_FOUND",
    });
  });
});

describe("ApiError", () => {
  it("extends Error with correct name", () => {
    const err = new ApiError(ERROR_CODES.NOT_FOUND, "not found", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
  });

  it("stores code, message, statusCode, retryable, details", () => {
    const err = new ApiError(
      ERROR_CODES.RATE_LIMITED,
      "slow down",
      429,
      true,
      { retryAfter: 60 },
    );
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.message).toBe("slow down");
    expect(err.statusCode).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.details).toEqual({ retryAfter: 60 });
  });

  it("defaults retryable to false", () => {
    const err = new ApiError(ERROR_CODES.FORBIDDEN, "denied", 403);
    expect(err.retryable).toBe(false);
  });
});

describe("ApiError.from", () => {
  /**
   * Response ปลอมที่รองรับ clone().json() — `from` อ่าน error body จริง
   *
   * @param status - HTTP status code
   * @param body - error body ที่ backend ส่งกลับมา (undefined = parse ไม่ได้)
   */
  function fakeResponse(status: number, body?: unknown): Response {
    const res = {
      status,
      clone: () => ({
        json: async () => {
          if (body === undefined) throw new SyntaxError("not json");
          return body;
        },
      }),
    };
    return res as unknown as Response;
  }

  it.each([
    [401, ERROR_CODES.UNAUTHORIZED, false],
    [403, ERROR_CODES.FORBIDDEN, false],
    [404, ERROR_CODES.NOT_FOUND, false],
    [429, ERROR_CODES.RATE_LIMITED, false],
    [400, ERROR_CODES.VALIDATION_ERROR, false],
    [422, ERROR_CODES.VALIDATION_ERROR, false],
    [500, ERROR_CODES.INTERNAL_ERROR, true],
    [502, ERROR_CODES.INTERNAL_ERROR, true],
  ])("maps %i → %s (retryable: %s)", async (status, code, retryable) => {
    const err = await ApiError.from(fakeResponse(status), "fallback");
    expect(err.code).toBe(code);
    expect(err.statusCode).toBe(status);
    expect(err.retryable).toBe(retryable);
  });

  it("falls back to the caller's message when the body has none", async () => {
    const err = await ApiError.from(fakeResponse(500), "custom msg");
    expect(err.message).toBe("custom msg");
    expect(err.serverMessage).toBeUndefined();
  });

  it("prefers the backend message when there is one", async () => {
    const err = await ApiError.from(
      fakeResponse(400, { message: "รหัสนี้ถูกใช้แล้ว" }),
      "Failed to create location",
    );
    expect(err.serverMessage).toBe("รหัสนี้ถูกใช้แล้ว");
    expect(err.message).toBe("รหัสนี้ถูกใช้แล้ว");
  });

  it("ignores a non-string or blank body message", async () => {
    expect(
      (await ApiError.from(fakeResponse(400, { message: 42 }), "fb"))
        .serverMessage,
    ).toBeUndefined();
    expect(
      (await ApiError.from(fakeResponse(400, { message: "  " }), "fb"))
        .serverMessage,
    ).toBeUndefined();
  });

  it("survives a body that is not JSON", async () => {
    const err = await ApiError.from(fakeResponse(503), "fb");
    expect(err.message).toBe("fb");
  });
});

// C5: แยก 403 ของ license ออกจาก 403 ของสิทธิ์ — key เดียวที่แยกได้เด็ดขาดคือ
// body.error.code (phase-c-backend-contract.md ข้อ 5c) ต้องไม่คีย์กับ message/status
describe("licenseErrorCodeFrom", () => {
  it("returns LICENSE_REQUIRED when body.error.code matches", () => {
    expect(
      licenseErrorCodeFrom({
        error: { code: "LICENSE_REQUIRED", id: 2110001 },
        feature: "procurement.purchase_request",
        bu_codes: ["BU01"],
      }),
    ).toBe("LICENSE_REQUIRED");
  });

  it("returns LICENSE_EXPIRED when body.error.code matches", () => {
    expect(
      licenseErrorCodeFrom({ error: { code: "LICENSE_EXPIRED", id: 2110002 } }),
    ).toBe("LICENSE_EXPIRED");
  });

  // Task 5.3: โค้ดที่สาม — เกินโควตาที่นั่งของ cluster (evaluateSeat ฝั่ง backend, Task 5.1/5.2)
  it("returns SEAT_LIMIT_EXCEEDED when body.error.code matches", () => {
    expect(
      licenseErrorCodeFrom({
        error: { code: "SEAT_LIMIT_EXCEEDED" },
        bu_codes: ["BU01"],
      }),
    ).toBe("SEAT_LIMIT_EXCEEDED");
  });

  // permission 403 จริง — error เหลือแค่ {message:"Forbidden"} ไม่มี code เลย
  it("returns undefined for a real permission-403 body", () => {
    expect(
      licenseErrorCodeFrom({
        message: "Permission denied: You do not have the required permissions for BU(s): BU01",
        error: { message: "Forbidden" },
      }),
    ).toBeUndefined();
  });

  it("returns undefined for an unrelated error.code (e.g. SEAT_LIMIT_REACHED)", () => {
    expect(
      licenseErrorCodeFrom({ error: { code: "SEAT_LIMIT_REACHED" } }),
    ).toBeUndefined();
  });

  it.each([
    ["null body", null],
    ["undefined body", undefined],
    ["a bare string body", "Forbidden"],
    ["body with no error key", { message: "Forbidden" }],
    ["error as a string, not an object", { error: "Forbidden" }],
    ["error.code as a non-string", { error: { code: 123 } }],
  ])("does not throw and returns undefined for %s", (_label, body) => {
    expect(() => licenseErrorCodeFrom(body)).not.toThrow();
    expect(licenseErrorCodeFrom(body)).toBeUndefined();
  });
});

describe("userFacingServerMessage", () => {
  // 5xx messages can carry internal detail — they must never reach a user.
  it("exposes the backend message for 4xx", () => {
    const err = new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "dup",
      400,
      false,
      undefined,
      "รหัสนี้ถูกใช้แล้ว",
    );
    expect(err.userFacingServerMessage).toBe("รหัสนี้ถูกใช้แล้ว");
  });

  it("hides it for 5xx", () => {
    const err = new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      "boom",
      500,
      true,
      undefined,
      "NullPointerException at OrderService.java:412",
    );
    expect(err.userFacingServerMessage).toBeUndefined();
  });

  it("is undefined when the backend said nothing", () => {
    expect(
      new ApiError(ERROR_CODES.VALIDATION_ERROR, "x", 400)
        .userFacingServerMessage,
    ).toBeUndefined();
  });
});
