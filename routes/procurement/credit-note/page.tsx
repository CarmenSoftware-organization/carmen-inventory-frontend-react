import CnComponent from "./_components/cn-component";

/**
 * หน้ารายการใบลดหนี้ (Credit Note) สำหรับโมดูลจัดซื้อ
 * เป็น entry point ของเส้นทาง /procurement/credit-note ที่ render `CnComponent` ซึ่งคุมทั้ง toolbar, ตารางรายการ และ pagination
 *
 * @returns React element ของหน้ารายการใบลดหนี้
 *
 * @example
 * // ใช้งานโดย Next.js App Router อัตโนมัติเมื่อเข้า URL /procurement/credit-note
 * export default CreditNotePage;
 */
export default function CreditNotePage() {
  return <CnComponent />;
}

export const Component = CreditNotePage;
