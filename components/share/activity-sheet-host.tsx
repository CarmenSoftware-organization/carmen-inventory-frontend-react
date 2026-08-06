import { Suspense, lazy, useEffect, useState } from "react";

// sheet จริงหนัก (diff renderer + ไทม์ไลน์) และผู้ใช้ส่วนใหญ่ไม่เคยกดเปิด
// จึงแยกออกไปให้โหลดตอนเปิดครั้งแรกเท่านั้น ไม่ติดไปกับ chunk ของ shell
const ActivitySheet = lazy(() =>
  import("./activity-sheet").then((mod) => ({ default: mod.ActivitySheet })),
);

export const ACTIVITY_SHEET_EVENT = "open-activity";

interface ActivityTarget {
  id: string;
  label?: string;
}

/**
 * เปิด activity sheet ของรายการหนึ่ง เรียกได้จากทุกที่ในแอปโดยไม่ต้องถือ state
 *
 * ใช้กลไก CustomEvent ชุดเดียวกับ `dispatchPermissionDenied` เพราะจุดเรียกกระจาย
 * อยู่กว่า 50 แห่ง (ทุกหน้ารายละเอียด + ทุกแถวของทุก list) — ถ้าให้แต่ละหน้าถือ
 * state เองจะได้โค้ดซ้ำหลายร้อยบรรทัด และ `DataGridRowActions` ซึ่งเป็นใบไม้ลึกใน
 * column def จะต้องรับ callback ไล่ขึ้นไปสามชั้น
 * @param id - entity id ของรายการ (UUID ไม่ซ้ำข้ามตาราง จึงไม่ต้องบอกชื่อตาราง)
 * @param label - เลขที่เอกสารหรือชื่อรายการ ใช้แสดงในคำอธิบายหัว sheet
 * @example
 * openActivity(purchaseOrder.id, purchaseOrder.po_no);
 */
export function openActivity(id: string, label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ActivityTarget>(ACTIVITY_SHEET_EVENT, {
      detail: { id, label },
    }),
  );
}

/**
 * ตัวรับ event ของ activity sheet — mount ครั้งเดียวที่ `routes/root-layout.tsx`
 *
 * อยู่ในชั้น `RequireAuth` เพราะ sheet ข้างในต้องใช้ buCode จาก profile ซึ่งยังไม่มี
 * ตอนหน้า login — mount สูงกว่านั้นจะได้คอมโพเนนต์ที่มีอยู่แต่ใช้งานไม่ได้
 *
 * คืน `null` จนกว่าจะมีคนเรียก `openActivity()` ครั้งแรก ทำให้ยังไม่มีการโหลด
 * chunk ของ sheet และไม่มี DOM ส่วนเกินในทุกหน้า
 * @returns React element ของ sheet หรือ null เมื่อยังไม่เคยเปิด
 * @example
 * // ใน root-layout.tsx
 * <ActivitySheetHost />
 */
export function ActivitySheetHost() {
  const [target, setTarget] = useState<ActivityTarget | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<ActivityTarget>) => setTarget(e.detail);
    globalThis.window.addEventListener(
      ACTIVITY_SHEET_EVENT,
      handler as EventListener,
    );
    return () => {
      globalThis.window.removeEventListener(
        ACTIVITY_SHEET_EVENT,
        handler as EventListener,
      );
    };
  }, []);

  if (!target) return null;

  return (
    <Suspense fallback={null}>
      <ActivitySheet
        // key บังคับให้ sheet เริ่มใหม่เมื่อสลับไปดูรายการอื่นทั้งที่ยังเปิดค้างอยู่
        // ไม่งั้นแถวที่กางไว้ของรายการเดิมจะค้างมาทับรายการใหม่
        key={target.id}
        entityId={target.id}
        label={target.label}
        open
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </Suspense>
  );
}
