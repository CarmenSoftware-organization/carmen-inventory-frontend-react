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
   * ข้อความจาก error body ของ backend (ถ้ามีและอ่านได้)
   *
   * แยกจาก `message` เพราะ `message` เป็น string ที่ dev เขียนไว้ตอนเรียก
   * (ภาษาอังกฤษ ไม่แปล) ส่วนตัวนี้เอามาโชว์ user ได้ **เฉพาะ 4xx** เท่านั้น —
   * 5xx ห้ามโชว์ เพราะอาจหลุด internal detail (ดู `userFacingServerMessage`)
   */
  public readonly serverMessage?: string;

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
   * @param serverMessage - message ที่อ่านได้จาก error body ของ backend
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
    serverMessage?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.serverMessage = serverMessage;
  }

  /**
   * message จาก backend ที่ปลอดภัยพอจะแสดงให้ user เห็น
   *
   * คืนค่าเฉพาะเมื่อเป็น client error (4xx) ที่ backend ตั้งใจอธิบายให้ user
   * แก้ไขได้ เช่น "code ซ้ำ" — 5xx คืน undefined เสมอ ให้ caller ตกไปใช้
   * ข้อความกลางที่แปลแล้วแทน
   */
  get userFacingServerMessage(): string | undefined {
    if (!this.serverMessage) return undefined;
    const status = this.statusCode ?? 0;
    return status >= 400 && status < 500 ? this.serverMessage : undefined;
  }

  /**
   * สร้าง ApiError จาก Response object ของ fetch
   *
   * แปลง HTTP status code เป็น ErrorCode อัตโนมัติ, mark retryable=true สำหรับ
   * 5xx และ **อ่าน `message` จาก error body** เก็บไว้ที่ `serverMessage`
   *
   * async เพราะต้องอ่าน body — เดิมชื่อ `fromResponse` และเป็น sync ซึ่งทิ้ง
   * body ทั้งดุ้น ทำให้ validation error ของ backend ไปไม่ถึง user เลย
   * (เปลี่ยนชื่อเพื่อให้ tsc จับ call site ที่ลืม `await` ได้ — `throw` รับ
   * Promise ได้โดยไม่ error)
   *
   * @param res - Response object จาก fetch
   * @param fallbackMessage - ข้อความสำรองสำหรับ dev หากไม่มี message จาก server
   * @param sanitize - ปรับ message จาก server ก่อนใช้ (เช่นตัด placeholder ที่ค้าง)
   * @returns instance ของ ApiError
   * @example
   * ```ts
   * const res = await httpClient.get("/api/proxy/vendors");
   * if (!res.ok) throw await ApiError.from(res, "Failed to fetch vendors");
   * ```
   */
  static async from(
    res: Response,
    fallbackMessage: string,
    sanitize?: (message: string | undefined, fallback: string) => string,
  ): Promise<ApiError> {
    const code = statusToCode(res.status);
    const raw = await readServerMessage(res);
    // sanitize คืน fallback เมื่อ message ใช้ไม่ได้ — เทียบเพื่อไม่ให้ fallback
    // (ข้อความของ dev) กลายเป็น serverMessage ที่เอาไปโชว์ user
    const cleaned = sanitize ? sanitize(raw, fallbackMessage) : raw;
    const serverMessage = cleaned === fallbackMessage ? undefined : cleaned;
    return new ApiError(
      code,
      serverMessage || fallbackMessage,
      res.status,
      res.status >= 500,
      undefined,
      serverMessage,
    );
  }
}

/**
 * อ่าน `message` จาก error body — clone() ก่อนเพื่อไม่ consume body ของ caller
 * คืน undefined หาก parse ไม่ได้หรือไม่มี field `message` ที่เป็น string
 */
const readServerMessage = async (res: Response): Promise<string | undefined> => {
  try {
    const body = await res.clone().json();
    return typeof body?.message === "string" && body.message.trim()
      ? body.message
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * แปลง HTTP status code เป็น ErrorCode ของระบบ
 *
 * ใช้ภายใน `ApiError.from` เพื่อ map 401/403/404/429/5xx ไปยัง ErrorCode
 * ที่สอดคล้องกัน
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
