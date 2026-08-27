import type { ReviewTransactionKey } from "@/types/period-end";

const MODULE_PATHS: Record<ReviewTransactionKey, string> = {
  pr: "/procurement/purchase-request",
  po: "/procurement/purchase-order",
  grn: "/procurement/goods-receive-note",
  cn: "/procurement/credit-note",
  sr: "/store-operation/store-requisition",
  si: "/inventory-management/inventory-adjustment",
  so: "/inventory-management/inventory-adjustment",
};

/**
 * สร้างลิงก์ไปหน้าเอกสารต้นทางของแต่ละโมดูล
 *
 * `si`/`so` ไม่มีหน้าโมดูลของตัวเอง — ใช้หน้า Inventory Adjustment ร่วมกัน และ `?type=`
 * เป็นข้อบังคับ ไม่ใช่ของประดับ เพราะ `edit-inventory-adjustment-content.tsx` เรนเดอร์
 * `ErrorState` ทันทีถ้าไม่มี query นี้
 *
 * @param moduleKey - โมดูลของเอกสาร
 * @param id - id ของเอกสาร
 * @returns path พร้อม query ที่จำเป็น
 * @example
 * ```ts
 * buildDocumentPath("si", "abc"); // "/inventory-management/inventory-adjustment/abc?type=stock-in"
 * ```
 */
export function buildDocumentPath(
  moduleKey: ReviewTransactionKey,
  id: string,
): string {
  const base = `${MODULE_PATHS[moduleKey]}/${id}`;
  if (moduleKey === "si") return `${base}?type=stock-in`;
  if (moduleKey === "so") return `${base}?type=stock-out`;
  return base;
}
