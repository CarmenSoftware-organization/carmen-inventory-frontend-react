import { useEffect } from "react";
import { useErrorToast } from "@/hooks/use-error-toast";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { setApiErrorHandler } from "@/lib/api-error-handler";

/**
 * แสดง toast เมื่อ mutation ใดก็ตามล้มเหลว — mount ครั้งเดียวใน `Providers`
 *
 * เดิมแต่ละ mutation ทำ `toast.error(err.message)` เอง ซึ่ง `message` คือ string
 * ภาษาอังกฤษที่ dev hardcode ไว้ (เช่น "Failed to fetch comments") ไม่แปล ไม่บอก
 * สาเหตุจริง และทิ้ง `code` ที่ ApiError มีอยู่แล้ว ตัวนี้ดักที่เดียวแล้วส่งต่อให้
 * `useErrorToast` ซึ่งเป็นเจ้าของรูปแบบ toast (ข้อความตาม locale + error id +
 * dev detail) อยู่ก่อนแล้ว
 *
 * @returns null — ไม่ render อะไร ทำหน้าที่ติดตั้ง handler อย่างเดียว
 */
export function ApiErrorToaster() {
  const errorToast = useErrorToast();

  useEffect(() => {
    setApiErrorHandler((error) => {
      // 401/403 มี UI ของตัวเองอยู่แล้ว (redirect ไป login / PermissionDeniedDialog)
      // — toast ซ้ำจะกลายเป็นเสียงรบกวนที่ user ทำอะไรกับมันไม่ได้
      if (error instanceof ApiError && isHandledElsewhere(error.code)) return;
      errorToast(error);
    });
    return () => setApiErrorHandler(null);
  }, [errorToast]);

  return null;
}

const isHandledElsewhere = (code: string) =>
  code === ERROR_CODES.UNAUTHORIZED ||
  code === ERROR_CODES.SESSION_EXPIRED ||
  code === ERROR_CODES.FORBIDDEN;
