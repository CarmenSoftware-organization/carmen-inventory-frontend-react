
import { useCallback } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  getDevErrorDetail,
  getErrorId,
  getUserErrorMessage,
} from "@/lib/error-message";

/**
 * Hook แสดง toast error ด้วยข้อความ user-friendly ตาม i18n
 *
 * - Production: user เห็นแค่ข้อความสั้น ๆ ตาม error code (network/timeout/...)
 * - Development: เพิ่ม description โชว์ raw error + code เพื่อช่วย debug
 * - มี error ID สำหรับ user copy ส่งให้ support
 *
 * @example
 * ```ts
 * const errorToast = useErrorToast();
 * updateMutation.mutate(payload, {
 *   onError: (err) => errorToast(err),
 * });
 * ```
 */
export function useErrorToast() {
  const t = useTranslations("errors");

  // useCallback: `<ApiErrorToaster />` ใส่ตัวนี้ใน dependency ของ useEffect —
  // ถ้าสร้างใหม่ทุก render จะถอด/ติดตั้ง handler ซ้ำทุกครั้งที่ re-render
  return useCallback(
    (err: unknown) => {
      // Log ให้ dev เห็นเสมอ (console เป็น sentry แบบลูกทุ่ง)
      if (import.meta.env.DEV) {
        console.error("[error-toast]", err);
      }

      const message = getUserErrorMessage(err, t);
      const detail = getDevErrorDetail(err);
      const errorId = getErrorId(err);

      // Description: รวม errorId + dev detail (ถ้ามี)
      const descLines: string[] = [];
      if (errorId) descLines.push(`${t("errorId")}: ${errorId}`);
      if (detail) descLines.push(detail);
      const description =
        descLines.length > 0 ? descLines.join(" · ") : undefined;

      toast.error(message, { description });
    },
    [t],
  );
}
