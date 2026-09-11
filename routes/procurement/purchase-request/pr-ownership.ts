import type { PurchaseRequest } from "@/types/purchase-request";

/**
 * ใบขอซื้อใบนี้ ผู้ใช้คนนี้ลบได้ไหม
 *
 * backend คืน 403 ให้คนที่ไม่ได้เป็นคนเปิดใบ **แม้ใบจะยังเป็น draft** — เดิมฝั่ง FE
 * ไม่รู้เรื่องนี้เลย ปุ่มลบจึงเปิดกล่องยืนยันให้ก่อน แล้วค่อยไปเด้ง "ไม่มีสิทธิ์" ตอนกดยืนยัน
 * ซึ่งอ่านแล้วเหมือนระบบพัง (ถามว่าจะลบไหม พอตอบว่าลบ กลับบอกว่าลบไม่ได้)
 *
 * ตรรกะนี้เป็นฟังก์ชันบริสุทธิ์เพื่อ unit test ตรง ๆ — ทั้งฟอร์ม, แถวในตาราง, การ์ด
 * และปุ่มลบหลายใบ อ่านตัวเดียวกันหมด จะได้ไม่ตัดสินคนละแบบในหน้าเดียวกัน
 *
 * @param pr - ใบที่จะลบ
 * @param userId - `useProfile().userId` ของคนที่กำลังใช้งาน
 * @param isAdmin - `useCan().isAdmin` — admin ของ BU ข้ามได้เหมือนสิทธิ์อื่นทั้งแอป
 */
export function canDeletePr(
  pr: Pick<PurchaseRequest, "requestor_id"> | null | undefined,
  userId: string | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const requestorId = pr?.requestor_id;
  // ไม่รู้ว่าใครเป็นเจ้าของ (payload ไม่ได้ส่ง `requestor_id` มา) → ไม่บล็อกเอง
  // ปล่อยให้ backend ตัดสิน ดีกว่าล็อกปุ่มจากข้อมูลที่ไม่มี
  if (!requestorId || !userId) return true;
  return requestorId === userId;
}
