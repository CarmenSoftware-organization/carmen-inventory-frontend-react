import { describe, it, expect } from "vitest";
import { ApiError, ERROR_CODES } from "./api-error";

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

describe("ApiError.fromResponse", () => {
  /**
   * สร้าง Response object ปลอมสำหรับเทส โดยกำหนดเฉพาะ status code
   *
   * @param status - HTTP status code ที่ต้องการ
   * @returns Response-like object สำหรับใช้ใน ApiError.fromResponse
   */
  function fakeResponse(status: number): Response {
    return { status } as Response;
  }

  it("maps 401 → UNAUTHORIZED", () => {
    const err = ApiError.fromResponse(fakeResponse(401), "auth failed");
    expect(err.code).toBe(ERROR_CODES.UNAUTHORIZED);
    expect(err.statusCode).toBe(401);
    expect(err.retryable).toBe(false);
  });

  it("maps 403 → FORBIDDEN", () => {
    const err = ApiError.fromResponse(fakeResponse(403), "forbidden");
    expect(err.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(err.statusCode).toBe(403);
    expect(err.retryable).toBe(false);
  });

  it("maps 404 → NOT_FOUND", () => {
    const err = ApiError.fromResponse(fakeResponse(404), "missing");
    expect(err.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(err.retryable).toBe(false);
  });

  it("maps 429 → RATE_LIMITED", () => {
    const err = ApiError.fromResponse(fakeResponse(429), "rate limited");
    expect(err.code).toBe(ERROR_CODES.RATE_LIMITED);
    expect(err.retryable).toBe(false); // 429 < 500
  });

  it("maps 500 → INTERNAL_ERROR (retryable)", () => {
    const err = ApiError.fromResponse(fakeResponse(500), "server error");
    expect(err.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(err.retryable).toBe(true);
  });

  it("maps 502 → INTERNAL_ERROR (retryable)", () => {
    const err = ApiError.fromResponse(fakeResponse(502), "bad gateway");
    expect(err.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(err.retryable).toBe(true);
  });

  it("maps 422 → VALIDATION_ERROR (not retryable)", () => {
    const err = ApiError.fromResponse(fakeResponse(422), "invalid");
    expect(err.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(err.retryable).toBe(false);
  });

  it("maps 400 → VALIDATION_ERROR (not retryable)", () => {
    const err = ApiError.fromResponse(fakeResponse(400), "bad request");
    expect(err.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(err.retryable).toBe(false);
  });

  it("uses fallbackMessage as the error message", () => {
    const err = ApiError.fromResponse(fakeResponse(500), "custom msg");
    expect(err.message).toBe("custom msg");
  });
});
