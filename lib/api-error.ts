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

/** error code สองตัวที่ `LicenseInterceptor` ฝั่ง backend โยนมาเมื่อ feature ไม่อยู่ในสัญญา/สัญญาหมดอายุ */
export const LICENSE_ERROR_CODES = {
  LICENSE_REQUIRED: "LICENSE_REQUIRED",
  LICENSE_EXPIRED: "LICENSE_EXPIRED",
} as const;

export type LicenseErrorCode =
  (typeof LICENSE_ERROR_CODES)[keyof typeof LICENSE_ERROR_CODES];

/**
 * แยก 403 ของ license ออกจาก 403 ของสิทธิ์ (permission) — คีย์เดียวที่แยกได้เด็ดขาดคือ
 * `body.error.code` ("LICENSE_REQUIRED" | "LICENSE_EXPIRED") ตามสัญญาจริงจาก
 * `LicenseInterceptor` (backend) — **ห้ามคีย์กับ `message` หรือ `status`** เพราะ 403
 * ของ permission ก็เป็น 403 เหมือนกันและ `message` ขึ้นกับภาษา
 *
 * permission 403 ของ backend ส่ง `error` เป็น `{message:"Forbidden"}` เสมอ (ไม่มี `code`)
 * — คืน `undefined` สำหรับกรณีนั้นและกรณี body รูปแปลกทุกแบบ (null, ไม่มี `error`,
 * `error` เป็น string) เพื่อให้ caller ปล่อยไปเส้นทาง permission เดิม ไม่ throw
 *
 * @param body - error body ที่ parse จาก response แล้ว (JSON.parse ผลลัพธ์, ชนิดอะไรก็ได้)
 * @returns license error code เมื่อแมตช์ ไม่งั้น undefined
 * @example
 * ```ts
 * licenseErrorCodeFrom({ error: { code: "LICENSE_REQUIRED" } }); // "LICENSE_REQUIRED"
 * licenseErrorCodeFrom({ error: { message: "Forbidden" } });     // undefined
 * licenseErrorCodeFrom(null);                                    // undefined
 * ```
 */
export function licenseErrorCodeFrom(
  body: unknown,
): LicenseErrorCode | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return code === LICENSE_ERROR_CODES.LICENSE_REQUIRED ||
    code === LICENSE_ERROR_CODES.LICENSE_EXPIRED
    ? code
    : undefined;
}

/**
 * error นี้เกิดจากการ "ส่งไม่ถึง" ไม่ใช่คำตอบจาก backend หรือไม่
 *
 * message ของสองกรณีนี้เป็นภาษาอังกฤษที่ dev เขียนไว้ตอน throw (เช่น "Auth server unavailable")
 * ไม่ได้ผ่านระบบแปล การเอา `error.message` ไปโชว์ตรง ๆ จึงทำให้ผู้ใช้ภาษาไทยเห็นอังกฤษดิบ
 * หน้าจอต้องเช็คด้วยตัวนี้แล้วใช้ข้อความที่แปลไว้แทน
 *
 * @param error - error ที่ catch มา รูปแบบใดก็ได้
 * @returns true เมื่อเป็น network error หรือ timeout
 */
export function isTransportError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === ERROR_CODES.NETWORK_ERROR ||
      error.code === ERROR_CODES.TIMEOUT)
  );
}

/**
 * อ่าน `message` จาก error body — clone() ก่อนเพื่อไม่ consume body ของ caller
 * คืน undefined หาก parse ไม่ได้หรือไม่มี field `message` ที่เป็น string
 */
const readServerMessage = async (
  res: Response,
): Promise<string | undefined> => {
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
