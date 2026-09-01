import { ApiError, ERROR_CODES, type ErrorCode } from "@/lib/api-error";
import type { TranslationFn } from "@/lib/i18n-schema";

/** Map ApiError codes → i18n key under `errors.*` namespace */
const CODE_TO_KEY: Record<ErrorCode, string> = {
  [ERROR_CODES.UNAUTHORIZED]: "sessionExpired",
  [ERROR_CODES.SESSION_EXPIRED]: "sessionExpired",
  [ERROR_CODES.FORBIDDEN]: "noPermission",
  [ERROR_CODES.VALIDATION_ERROR]: "missingField",
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: "missingField",
  [ERROR_CODES.NETWORK_ERROR]: "network",
  [ERROR_CODES.TIMEOUT]: "timeout",
  [ERROR_CODES.BACKEND_UNAVAILABLE]: "serverDown",
  [ERROR_CODES.RATE_LIMITED]: "tooFast",
  [ERROR_CODES.INTERNAL_ERROR]: "serverDown",
  [ERROR_CODES.NOT_FOUND]: "notFound",
};

/**
 * `error.code` จาก backend ที่ผู้ใช้แก้เองได้ → คีย์ i18n เฉพาะเรื่อง
 *
 * ข้อความกลางถูกใช้กับ 400/422 ทุกตัวเพราะ backend เคยส่ง stack trace ของ Prisma กลับมา — แต่การ
 * เหวี่ยงแหแบบนั้นกลืนเหตุผลที่ผู้ใช้แก้ได้เองไปด้วย เช่น workflow ที่แก้ไม่ได้เพราะยังมีเอกสารค้าง
 * ผู้ใช้เห็นแค่ "กรอกไม่ถูกต้อง" แล้วไล่ตรวจฟอร์มที่ไม่มีอะไรผิดเลย
 *
 * ใส่เฉพาะรหัสที่ผู้ใช้ทำอะไรกับมันได้ รหัสที่เป็นความผิดพลาดภายในให้ตกไปที่ข้อความกลางตามเดิม
 */
const APP_CODE_TO_KEY: Record<string, string> = {
  WORKFLOW_HAS_IN_PROGRESS_DOCUMENTS: "workflowInProgress",
};

/** ข้อความกลางเมื่อไม่รู้ว่าเกิดอะไร — บอกว่าให้ทำอะไรต่อ ดีกว่าบอกว่าอะไรพัง */
function fallbackKey(code: ErrorCode, statusCode?: number): string {
  // 400 ทั่วไปไม่ได้แปลว่า "กรอกไม่ครบ" เสมอไป กรอกครบแต่ค่าผิดก็ 400 —
  // บอกให้ตรวจฟอร์มอีกรอบตรงกว่า ส่วนโค้ดที่บอกชัดว่าขาด field ค่อยใช้ missingField
  if (code === ERROR_CODES.MISSING_REQUIRED_FIELD) return "missingField";
  if (statusCode === 409) return "documentChanged";
  return "invalidForm";
}

/**
 * แปลง error ใดๆ ให้เป็นข้อความ user-friendly ตาม i18n
 *
 * - `ApiError` → match code กับ `errors.*` namespace
 * - 400/422/409: ใช้ข้อความกลางของเราเสมอ ไม่ส่งต่อข้อความจาก server
 * - Error อื่นๆ → fallback `errors.unexpected`
 *
 * ข้อความดิบไม่ได้หายไปไหน — dev ยังเห็นครบใน description ผ่าน
 * `getDevErrorDetail` และผู้ใช้ยังได้ error id ไว้แจ้งทีมงานเสมอ
 *
 * @param err - error ที่จับได้
 * @param t - useTranslations("errors") instance
 * @returns ข้อความสำหรับแสดงให้ user
 *
 * @example
 * ```ts
 * const tErr = useTranslations("errors");
 * try { ... } catch (err) { toast.error(getUserErrorMessage(err, tErr)); }
 * ```
 */
export function getUserErrorMessage(err: unknown, t: TranslationFn): string {
  if (err instanceof ApiError) {
    if (
      err.code === ERROR_CODES.VALIDATION_ERROR ||
      err.code === ERROR_CODES.MISSING_REQUIRED_FIELD
    ) {
      // ไม่เอา message จาก server มาโชว์เลย — backend ส่ง stack trace ของ Prisma
      // กลับมาใน 400 ได้จริง ("1482 await prisma.tb_purchase_request_detail
      // .updateMany(... Unique constraint failed on the fields: ...") ซึ่งพนักงาน
      // หน้างานอ่านไม่รู้เรื่อง · ข้อความกลางที่บอกว่าให้ทำอะไรต่อใช้ได้จริงกว่า
      // ต่อไปถ้าจะแปลบางเคสให้เจาะจงขึ้น (เช่น unique constraint ของ
      // product+location = "ใบนี้มีสินค้าตัวนี้ในคลังนี้อยู่แล้ว") ให้ map เป็นคีย์
      // i18n ที่นี่ ไม่ใช่ปล่อยข้อความดิบผ่านไป
      // รหัสจาก catalog มาก่อน: มันบอกเหตุผลจริงที่ backend ปฏิเสธ ส่วนข้อความกลางเป็นทางลงเมื่อ
      // ไม่รู้ว่าเป็นเรื่องอะไร ไม่ใช่ค่าเริ่มต้นที่ควรกลบเหตุผลที่รู้อยู่แล้ว
      const mapped = err.appCode ? APP_CODE_TO_KEY[err.appCode] : undefined;
      return t(mapped ?? fallbackKey(err.code, err.statusCode));
    }
    const key = CODE_TO_KEY[err.code];
    return key ? t(key) : t("unexpected");
  }
  return t("unexpected");
}

/**
 * Correlation ID สำหรับให้ user แจ้ง support
 * ใช้ statusCode + เลขสุ่ม timestamp (พอใช้ก่อนมี Sentry/Datadog)
 */
export function getErrorId(err: unknown): string | undefined {
  if (err instanceof ApiError && err.statusCode) {
    const ts = Date.now().toString(36).slice(-6).toUpperCase();
    return `${err.code.slice(0, 3)}-${err.statusCode}-${ts}`;
  }
  return undefined;
}
