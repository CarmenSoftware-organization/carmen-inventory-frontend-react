import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";

/**
 * คำนวณ action รวมของ stage ปัจจุบันจากสถานะของ items ทุกตัวใน PR โดยใช้
 * ลำดับความสำคัญ: review (มีอย่างน้อยหนึ่งรายการขอ review) > rejected
 * (ทุกรายการปฏิเสธ) > approved (ทุกรายการเป็น approve/reject และมีอย่างน้อย
 * หนึ่งรายการ approve) ใช้เพื่อตัดสินใจว่าควรแสดงปุ่ม workflow ปุ่มใดใน footer
 *
 * อยู่ในไฟล์ของตัวเองเพราะเงื่อนไข "ปุ่มไหนโผล่ตอนไหน" ห้ามแตกเป็นหลายชุด
 * @param statuses - รายการสถานะ `current_stage_status` ของแต่ละ item ใน PR
 * @returns ค่า `"none" | "review" | "rejected" | "approved"` สะท้อนปุ่มที่ควรแสดง
 * @example
 * computePurchaseAction(["approve", "reject"]); // => "approved"
 * computePurchaseAction(["review", "approve"]); // => "review"
 */
export function computePurchaseAction(
  statuses: string[],
): "none" | "review" | "rejected" | "approved" {
  if (statuses.length === 0) return "none";
  const isReject = (s: string) =>
    s === PR_ITEM_STAGE_STATUS.REJECT || s === PR_ITEM_STAGE_STATUS.REJECTED;
  const isApprove = (s: string) =>
    s === PR_ITEM_STAGE_STATUS.APPROVE || s === PR_ITEM_STAGE_STATUS.APPROVED;
  if (statuses.some((s) => s === PR_ITEM_STAGE_STATUS.REVIEW)) return "review";
  if (statuses.every(isReject)) return "rejected";
  if (statuses.every((s) => isApprove(s) || isReject(s)) && statuses.some(isApprove))
    return "approved";
  return "none";
}
