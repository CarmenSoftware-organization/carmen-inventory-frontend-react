import { useTranslations } from "use-intl";
import { ErrorState } from "@/components/ui/error-state";
import { ApiError, ERROR_CODES } from "@/lib/api-error";

/**
 * Error boundary page component สำหรับ Next.js App Router
 *
 * ใช้ใน app/(root)/{domain}/error.tsx ของแต่ละโมดูล แปลง ApiError code เป็น
 * key ของ namespace `errors.*` แล้วให้ ErrorState แสดงข้อความที่แปลแล้ว พร้อม
 * ปุ่ม retry ที่เรียก reset() ของ Next.js
 *
 * @example
 * ```tsx
 * // app/(root)/procurement/error.tsx
 * "use client";
 * export { default } from "@/components/ui/module-error-boundary";
 * ```
 */
export default function ModuleError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const t = useTranslations("errors");
  const message =
    error instanceof ApiError
      ? t(errorMessageKey(error.code))
      : error.message
        ? error.message
        : undefined;

  return <ErrorState message={message} onRetry={reset} />;
}

type ErrorMessageKey =
  | "sessionExpired"
  | "noPermission"
  | "notFound"
  | "tooFast"
  | "timeout"
  | "network"
  | "serverDown"
  | "missingField"
  | "unexpected";

/**
 * แปลงรหัส ERROR_CODES เป็น key ของ namespace `errors.*`
 * code ที่ไม่รู้จัก (รวมถึง INTERNAL_ERROR) ตกไปที่ "unexpected"
 */
const errorMessageKey = (code: string): ErrorMessageKey => {
  switch (code) {
    case ERROR_CODES.UNAUTHORIZED:
    case ERROR_CODES.SESSION_EXPIRED:
      return "sessionExpired";
    case ERROR_CODES.FORBIDDEN:
      return "noPermission";
    case ERROR_CODES.NOT_FOUND:
      return "notFound";
    case ERROR_CODES.RATE_LIMITED:
      return "tooFast";
    case ERROR_CODES.TIMEOUT:
      return "timeout";
    case ERROR_CODES.NETWORK_ERROR:
      return "network";
    case ERROR_CODES.BACKEND_UNAVAILABLE:
      return "serverDown";
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
      return "missingField";
    default:
      return "unexpected";
  }
};
