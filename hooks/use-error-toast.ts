import { useCallback } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { getErrorId, getUserErrorMessage } from "@/lib/error-message";

export function useErrorToast() {
  const t = useTranslations("errors");
  // ชื่อช่องมาจาก namespace `field` — ตัวเดียวกับป้ายบนฟอร์ม จะได้เรียกตรงกัน
  const tField = useTranslations("field");

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
      toast.error(getUserErrorMessage(err, t, tField), { duration: 5000 });
    },
    [t, tField],
  );
}
