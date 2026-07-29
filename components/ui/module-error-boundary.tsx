import { useTranslations } from "use-intl";
import { ErrorState } from "@/components/ui/error-state";
import { ApiError } from "@/lib/api-error";
import { getUserErrorMessage } from "@/lib/error-message";

/**
 * Error UI ประจำ section — ใช้ผ่าน `RouteErrorBoundaryAdapter` ของแต่ละโมดูล
 *
 * แปลง error เป็นข้อความตาม locale ด้วย `getUserErrorMessage` ตัวเดียวกับที่
 * `useErrorToast` ใช้ เพื่อให้ error เดียวกันอ่านเหมือนกันไม่ว่าจะโผล่เป็น toast
 * หรือเป็นหน้า error (เดิมไฟล์นี้มี mapping code→i18n เป็นสำเนาของตัวเอง ซึ่ง
 * ไม่ตรงกับ `lib/error-message.ts` — INTERNAL_ERROR เคยขึ้น "unexpected" ที่นี่
 * แต่ขึ้น "serverDown" ในของอีกอัน)
 *
 * @param props.error - error ที่ boundary จับได้
 * @param props.reset - ลองใหม่ (re-render subtree)
 * @returns React element ของ error state พร้อมปุ่ม retry
 */
export default function ModuleError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const t = useTranslations("errors");
  // error ที่ไม่ใช่ ApiError (bug ตอน render) ไม่มี code ให้แปล — โชว์ message ดิบ
  // ต่อไป เพราะเป็นข้อความของ dev ไม่ใช่ body จาก backend ที่อาจหลุด internal detail
  const message =
    error instanceof ApiError
      ? getUserErrorMessage(error, t)
      : error.message || undefined;

  return <ErrorState message={message} onRetry={reset} />;
}
