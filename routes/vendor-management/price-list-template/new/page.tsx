import { PriceListTemplateForm } from "../_components/plt-form";

/**
 * หน้าแบบฟอร์มสร้าง price list template ใหม่
 *
 * รายละเอียด: Server Component ที่ render `PriceListTemplateForm` โดยไม่ส่ง prop
 * ทำให้อยู่ในโหมด add — ผู้ใช้กรอกรายการสินค้าและโครงสร้างราคา แล้วกด save
 * เพื่อสร้าง template ใหม่ที่นำไปใช้ต่อกับ price list จริงได้
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้าสร้าง template
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/price-list-template/new
 * <NewPriceListTemplatePage />
 * ```
 */
export default function NewPriceListTemplatePage() {
  return <PriceListTemplateForm />;
}

export const Component = NewPriceListTemplatePage;
