import { PriceListForm } from "../_components/pl-form";

/**
 * หน้าแบบฟอร์มสร้าง price list ใหม่
 *
 * รายละเอียด: Server Component ที่ render `PriceListForm` โดยไม่ส่ง prop
 * ทำให้ฟอร์มอยู่ในโหมด add — กรอก vendor, currency, ช่วงเวลาใช้งาน และรายการสินค้า
 * แล้วกด save จะสร้าง price list ใหม่
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้าสร้าง price list
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/price-list/new
 * <NewPriceListPage />
 * ```
 */
export default function NewPriceListPage() {
  return <PriceListForm />;
}

export const Component = NewPriceListPage;
