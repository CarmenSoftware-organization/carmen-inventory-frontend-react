import { PcForm } from "../_components/pc-form";

/**
 * หน้าสร้าง Physical Count ใหม่
 * แสดง PcForm ในโหมด add โดยไม่ส่ง physicalCount prop
 *
 * @returns React element ของหน้าสร้าง physical count
 * @example
 * // เข้าถึงผ่าน URL: /inventory-management/physical-count/new
 * export default NewPhysicalCountPage;
 */
export default function NewPhysicalCountPage() {
  return <PcForm />;
}

export const Component = NewPhysicalCountPage;
