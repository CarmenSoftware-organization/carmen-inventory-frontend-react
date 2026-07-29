import { useCallback } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { getErrorId, getUserErrorMessage } from "@/lib/error-message";

/**
 * Hook แสดง toast error ด้วยข้อความ user-friendly ตาม i18n
 *
 * - toast แสดงประโยคเดียวตาม error code เสมอ ไม่มี description
 * - รายละเอียดดิบ + รหัส error ลง `console.error` ให้ dev ไล่ต่อ
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
      // Log ให้ dev เห็นเสมอ (console เป็น sentry แบบลูกทุ่ง) — รายละเอียดทาง
      // เทคนิคทั้งหมดอยู่ตรงนี้ที่เดียว ไม่ขึ้นไปอยู่บน toast
      if (import.meta.env.DEV) {
        console.error("[error-toast]", getErrorId(err), err);
      }

      // บรรทัดเดียวจบ ไม่มี description — เคยใส่รหัส error + รายละเอียดไว้ข้างล่าง
      // แล้ว backend ส่ง stack trace มาเป็นสิบบรรทัด toast กินครึ่งจอและไม่มีใคร
      // อ่าน · 5 วินาทีพอสำหรับประโยคเดียว และยังมีปุ่มปิดถ้าอยากไล่ก่อน
      toast.error(getUserErrorMessage(err, t), { duration: 5000 });
    },
    [t],
  );
}
