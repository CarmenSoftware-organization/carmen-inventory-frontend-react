import { useCallback } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-error";
import { useErrorToast } from "@/hooks/use-error-toast";

/**
 * Hook แสดง toast เมื่อส่งออก xlsx ไม่สำเร็จ
 *
 * ปุ่ม export ดึงข้อมูลจาก API ก่อนแล้วค่อยสร้างไฟล์ ล้มได้สองแบบ — แบบแรก
 * เป็น `ApiError` (เซสชันหมด เน็ตหลุด เซิร์ฟเวอร์ล่ม) ซึ่งมีข้อความเฉพาะของมัน
 * อยู่แล้วใน `errors.*` แบบที่สองคือ bug ตอนสร้างไฟล์ ซึ่งบอกได้แค่ว่าส่งออก
 * ไม่สำเร็จ
 *
 * เดิมทุกหน้า list ทำ `toast.error(err instanceof Error ? err.message : ...)`
 * ซึ่ง `message` คือสตริงอังกฤษที่ dev เขียน fallback ไว้ ("Failed to fetch
 * purchase orders") พนักงานหน้างานอ่านไม่รู้เรื่องและไม่ได้แปลด้วย
 *
 * @example
 * ```ts
 * const exportErrorToast = useExportErrorToast();
 * try { ... } catch (err) { exportErrorToast(err); }
 * ```
 */
export function useExportErrorToast() {
  const errorToast = useErrorToast();
  const tc = useTranslations("common");

  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        errorToast(err);
        return;
      }
      if (import.meta.env.DEV) {
        console.error("[export]", err);
      }
      toast.error(tc("exportFailed"));
    },
    [errorToast, tc],
  );
}
