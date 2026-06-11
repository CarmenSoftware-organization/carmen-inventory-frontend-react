import PriceListTemplateComponent from "./_components/plt-component";

/**
 * หน้ารายการ price list template ทั้งหมด
 *
 * รายละเอียด: Server Component ที่ตั้ง metadata title เป็น "Price List Templates"
 * แล้ว render `PriceListTemplateComponent` ซึ่งดูแลการแสดงรายการ template
 * ที่ใช้เป็นต้นแบบสำหรับสร้าง price list ใหม่
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้ารายการ template
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/price-list-template
 * <PriceListTemplatePage />
 * ```
 */
export default function PriceListTemplatePage() {
  return <PriceListTemplateComponent />;
}

export const Component = PriceListTemplatePage;
