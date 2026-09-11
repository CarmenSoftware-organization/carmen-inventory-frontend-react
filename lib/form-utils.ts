import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * สร้างข้อความยืนยันการลบ item ใน form สำหรับแสดงใน DeleteDialog
 *
 * อ่านชื่อของ item จาก form values ตาม nameField ที่ระบุ
 * หากไม่มีชื่อจะใช้ `Item #N` แทน
 *
 * @param index - index ของ item ใน array หรือ null
 * @param form - instance ของ useForm จาก react-hook-form
 * @param nameField - ชื่อ field ที่ใช้เป็นชื่อ item (default: "product_name")
 * @returns ข้อความยืนยันการลบ หรือ empty string หาก index เป็น null
 * @example
 * ```ts
 * getDeleteDescription(0, form, "product_name");
 * // 'Are you sure you want to remove "Coffee Beans"?'
 * ```
 */
export function getDeleteDescription<T extends FieldValues>(
  index: number | null,
  form: UseFormReturn<T>,
  nameField: string = "product_name",
) {
  if (index === null) return "";
  const name = form.getValues(
    `items.${index}.${nameField}` as unknown as Parameters<
      typeof form.getValues
    >[0],
  );
  const label = name || `Item #${index + 1}`;
  return `Are you sure you want to remove "${label}"?`;
}

/**
 * เลือกข้อความบนปุ่ม submit ของฟอร์ม entity ให้ตรงกับสิ่งที่กำลังเกิดขึ้นจริง
 *
 * สี่กรณี: สร้าง / กำลังสร้าง / บันทึก / กำลังบันทึก — ปุ่มที่เขียนคำเดียวตลอด
 * ทำให้ผู้ใช้ไม่รู้ว่ากดติดแล้วหรือยัง
 *
 * @param isPending - mutation กำลังทำงานอยู่ไหม
 * @param isAdd - อยู่โหมดสร้างใหม่ไหม (false = แก้ไขของเดิม)
 * @param tc - translator ของ namespace `common`
 * @param tform - translator ของ namespace `form`
 * @returns ข้อความที่จะแสดงบนปุ่ม
 * @example
 * ```ts
 * getSubmitLabel(false, true, tc, tform); // "Create"
 * getSubmitLabel(true, false, tc, tform); // "Saving..."
 * ```
 */
export function getSubmitLabel(
  isPending: boolean,
  isAdd: boolean,
  tc: (key: string) => string,
  tform: (key: string) => string,
): string {
  if (isPending) return isAdd ? tform("creating") : tform("saving");
  return isAdd ? tc("create") : tc("save");
}
