import { CnForm } from "../_components/cn-form";

/**
 * หน้าสร้างใบลดหนี้ใหม่ (New Credit Note)
 * เป็น route `/procurement/credit-note/new` ที่ render `CnForm` ในโหมดเพิ่มข้อมูล (add mode) โดยไม่มี prop ส่งเข้าไป
 *
 * @returns React element ของฟอร์มสร้างใบลดหนี้ในโหมดว่าง
 *
 * @example
 * // Next.js จะเรียกใช้งานอัตโนมัติเมื่อเปิด URL /procurement/credit-note/new
 * export default NewCreditNotePage;
 */
export default function NewCreditNotePage() {
  return <CnForm />;
}

export const Component = NewCreditNotePage;
