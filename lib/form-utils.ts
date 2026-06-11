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
    `items.${index}.${nameField}` as unknown as Parameters<typeof form.getValues>[0],
  );
  const label = name || `Item #${index + 1}`;
  return `Are you sure you want to remove "${label}"?`;
}
