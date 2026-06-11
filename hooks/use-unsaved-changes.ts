import { useEffect } from "react";

/**
 * Hook แจ้งเตือนผู้ใช้ก่อนปิด/รีเฟรชหน้าเมื่อมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
 * Bind listener ที่ event `beforeunload` เฉพาะตอน isDirty = true
 * และ cleanup อัตโนมัติเมื่อ unmount หรือ isDirty เปลี่ยน
 * @param isDirty - ฟอร์มมีการแก้ไขหรือไม่
 * @param message - ข้อความแจ้งเตือน (browser ส่วนใหญ่ไม่แสดงข้อความนี้แล้ว)
 * @returns void
 * @example
 * useUnsavedChanges(form.formState.isDirty);
 */
export function useUnsavedChanges(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Most browsers ignore the custom message but still prompt
      if (message) e.returnValue = message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, message]);
}
