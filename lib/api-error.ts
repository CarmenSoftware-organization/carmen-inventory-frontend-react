export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  FORBIDDEN: "FORBIDDEN",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Network
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  BACKEND_UNAVAILABLE: "BACKEND_UNAVAILABLE",

  // Rate Limit
  RATE_LIMITED: "RATE_LIMITED",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * คลาส Error มาตรฐานสำหรับ API errors ทั้งหมดในระบบ
 *
 * ใช้แทน Error ปกติเพื่อให้สามารถจำแนกประเภท error ได้ชัดเจน
 * รองรับการ retry และเก็บ status code ของ HTTP response
 *
 * @example
 * ```ts
 * throw new ApiError(ERROR_CODES.NOT_FOUND, "Vendor not found", 404);
 * ```
 */
export class ApiError extends Error {
  /**
   * สร้าง instance ของ ApiError พร้อมกำหนด code, message และข้อมูลประกอบ
   *
   * ใช้สำหรับ throw error ที่มีการจำแนกประเภทชัดเจน
   * สามารถ catch แล้วตรวจ code เพื่อแสดง UI ที่เหมาะสม
   *
   * @param code - รหัส error สำหรับจำแนกประเภท
   * @param message - ข้อความ error
   * @param statusCode - HTTP status code (ถ้ามี)
   * @param retryable - ระบุว่า request นี้สามารถ retry ได้หรือไม่
   * @param details - ข้อมูลเพิ่มเติม
   * @returns instance ของ ApiError
   * @example
   * ```ts
   * throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Invalid payload", 400, false, { field: "name" });
   * ```
   */
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * สร้าง ApiError จาก Response object ของ fetch
   *
   * แปลง HTTP status code เป็น ErrorCode อัตโนมัติ
   * และ mark retryable=true สำหรับ 5xx errors
   *
   * @param res - Response object จาก fetch
   * @param fallbackMessage - ข้อความสำรองหากไม่มี message จาก server
   * @returns instance ของ ApiError
   * @example
   * ```ts
   * const res = await httpClient.get("/api/proxy/vendors");
   * if (!res.ok) throw ApiError.fromResponse(res, "Failed to fetch vendors");
   * ```
   */
  static fromResponse(res: Response, fallbackMessage: string): ApiError {
    const code = statusToCode(res.status);
    return new ApiError(code, fallbackMessage, res.status, res.status >= 500);
  }
}

/**
 * แปลง HTTP status code เป็น ErrorCode ของระบบ
 *
 * ใช้ภายใน ApiError.fromResponse เพื่อ map 401/403/404/429/5xx
 * ไปยัง ErrorCode ที่สอดคล้องกัน
 *
 * @param status - HTTP status code
 * @returns ErrorCode ที่ตรงกับ status
 * @example
 * ```ts
 * statusToCode(404); // "NOT_FOUND"
 * statusToCode(503); // "INTERNAL_ERROR"
 * ```
 */
function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return status >= 500
        ? ERROR_CODES.INTERNAL_ERROR
        : ERROR_CODES.VALIDATION_ERROR;
  }
}
