import RequestPriceListComponent from "./_components/rfp-component";

/**
 * หน้ารายการ request price list (RFP) ทั้งหมด
 *
 * รายละเอียด: Server Component ที่ตั้ง metadata title เป็น "Request Price Lists"
 * แล้ว render `RequestPriceListComponent` ซึ่งจัดการการดึงข้อมูล, ค้นหา, กรอง
 * และตารางรายการ RFP ทั้งหมดในระบบ
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้ารายการ RFP
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/request-price-list
 * <RequestPriceListPage />
 * ```
 */
export default function RequestPriceListPage() {
  return <RequestPriceListComponent />;
}

export const Component = RequestPriceListPage;
