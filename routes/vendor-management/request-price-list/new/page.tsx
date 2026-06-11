import { RequestPriceListForm } from "../_components/rfp-form";

/**
 * หน้าแบบฟอร์มสร้าง request price list ใหม่
 *
 * รายละเอียด: Server Component ที่ render `RequestPriceListForm` โดยไม่ส่ง prop
 * ทำให้ฟอร์มอยู่ในโหมด add — กรอกข้อมูล vendor, item และระยะเวลาเสนอราคา
 * แล้วกด save จะสร้าง RFP ใหม่ในระบบ
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้าสร้าง RFP
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/request-price-list/new
 * <NewRequestPriceListPage />
 * ```
 */
export default function NewRequestPriceListPage() {
  return <RequestPriceListForm />;
}

export const Component = NewRequestPriceListPage;
