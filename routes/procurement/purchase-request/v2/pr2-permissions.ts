import { STAGE_ROLE } from "@/types/stage-role";

/**
 * สิทธิ์ตาม stage role — ยกกฎมาจากหน้าเดิมทั้งหมด ไม่คิดใหม่
 *
 * หน้าเดิมกระจายกฎพวกนี้อยู่หลายที่ (`pr-item-table` ส่ง isDisabled คนละแบบให้แต่ละ
 * cell, `pr-item-fields` คุมปุ่ม, `pr-item-expand` รับ isDisabled ที่คำนวณแยกอีกชั้น)
 * v2 รวมมาไว้ที่เดียวเพื่อให้เทียบกับของเดิมได้ทีละบรรทัด และกันหลุดตอนแก้ทีหลัง
 *
 * ที่มาของแต่ละกฎ:
 * - `isLockedAfterCreate` = `pr-item-table.tsx:85`
 *   → product / location / requested qty / หน่วยของ approved+foc แก้ได้เฉพาะ CREATE
 * - vendor / price / discount / tax = `pr-item-table.tsx:167`
 *   (`PrItemExpand isDisabled={isDisabled || role !== PURCHASE}`) → เฉพาะ PURCHASE
 * - approved qty / foc qty / delivery point / delivery date รับแค่ `isDisabled`
 *   → role ไหนก็แก้ได้ถ้าฟอร์มยังแก้ได้
 */
export interface Pr2Permissions {
  /** ฟอร์มทั้งใบแก้ไม่ได้ (view mode / กำลังบันทึก / ผู้สร้างหลัง submit) */
  readonly formLocked: boolean;
  /** ข้อมูลตั้งต้นของรายการ (สินค้า คลัง จำนวนขอ หน่วย) */
  readonly canEditRequestFields: boolean;
  /** ราคา ผู้ขาย ส่วนลด ภาษี */
  readonly canEditPricing: boolean;
  /** เพิ่ม/ลบรายการ */
  readonly canAddItems: boolean;
  /** ปุ่มดึงราคาอัตโนมัติ */
  readonly canAutoAllocate: boolean;
  /** เลือกแถวเพื่อทำ bulk action */
  readonly canSelectRows: boolean;
  /** โชว์คอลัมน์ checkbox — ต้องแก้ไขได้ด้วย ไม่ใช่แค่ role ถูก */
  readonly showSelectColumn: boolean;
  /**
   * ใบยังเป็นร่าง หรือคนดูคือผู้สร้าง — หน้าเดิมตัดคอลัมน์ approved/foc/checkbox
   * และไม่เคยมีคอลัมน์ผู้ขาย/ราคา/ส่วนลด/ภาษีเลยในกรณีนี้
   */
  readonly isCreatorView: boolean;
}

export function resolvePr2Permissions({
  role,
  isDisabled,
  isDraft,
}: {
  readonly role?: string;
  readonly isDisabled: boolean;
  readonly isDraft: boolean;
}): Pr2Permissions {
  const isCreateRole = role === STAGE_ROLE.CREATE;
  const isPurchase = role === STAGE_ROLE.PURCHASE;
  const isApprove = role === STAGE_ROLE.APPROVE;

  return {
    formLocked: isDisabled,
    canEditRequestFields: !isDisabled && (!role || isCreateRole),
    canEditPricing: !isDisabled && isPurchase,
    canAddItems: !isDisabled && isCreateRole,
    canAutoAllocate: !isDisabled && isPurchase,
    canSelectRows: isApprove || isPurchase,
    showSelectColumn: (isApprove || isPurchase) && !isDisabled,
    isCreatorView: isDraft || isCreateRole,
  };
}

