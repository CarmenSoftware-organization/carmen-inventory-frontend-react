import { createContext, useContext } from "react";

/**
 * Bridge ให้ปุ่ม "+" ใน action column ของ product row สั่งเพิ่ม location ได้
 * ทั้งที่ useFieldArray ของ locations อยู่ใน LocationsEditor (expanded content)
 *
 * LocationsEditor เป็นเจ้าของ useFieldArray เดียว (กัน field-array ไม่ sync ถ้ามี
 * useFieldArray ชื่อเดียวกันหลายตัว) → ลงทะเบียน prepend ของตัวเอง keyed ด้วย
 * item index; action cell เรียก handler นั้นเมื่อกด "+"
 */
export type AddLocationRegistry = Map<number, () => void>;

export const AddLocationRegistryContext =
  createContext<AddLocationRegistry | null>(null);

export const useAddLocationRegistry = () =>
  useContext(AddLocationRegistryContext);
