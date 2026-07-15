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
 * แปลง error ใดๆ ให้เป็นข้อความ user-friendly ตาม i18n
 *
 * - `ApiError` → match code กับ `errors.*` namespace
 * - VALIDATION_ERROR: ใช้ message จาก server โดยตรง (มักจะ user-friendly อยู่แล้ว)
 * - Error อื่นๆ → fallback `errors.unexpected`
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
    // Validation errors: server message มักจะอธิบายเฉพาะเจาะจง (เช่น "Email already in use")
    // ใช้ `userFacingServerMessage` ไม่ใช่ `message` เพราะ `message` จะ fallback
    // ไปเป็น string ที่ dev hardcode ไว้ ("Failed to create location") ซึ่งไม่แปล
    // และไม่ได้เขียนให้ user อ่าน — ไม่มี message จริงจาก server ก็ใช้ข้อความกลาง
    if (
      err.code === ERROR_CODES.VALIDATION_ERROR ||
      err.code === ERROR_CODES.MISSING_REQUIRED_FIELD
    ) {
      return err.userFacingServerMessage || t("missingField");
    }
    const key = CODE_TO_KEY[err.code];
    return key ? t(key) : t("unexpected");
  }
  return t("unexpected");
}

/**
 * ดึงรายละเอียดเชิงเทคนิคของ error สำหรับโชว์ใน dev mode (description)
 * Production: คืน undefined (user ไม่ต้องเห็น)
 */
export function getDevErrorDetail(err: unknown): string | undefined {
  if (!import.meta.env.DEV) return undefined;
  if (err instanceof Error) {
    const ext = err instanceof ApiError ? ` [${err.code}]` : "";
    return `${err.message}${ext}`;
  }
  return String(err);
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
