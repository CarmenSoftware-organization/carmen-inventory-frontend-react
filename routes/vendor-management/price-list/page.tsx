import PriceListComponent from "./_components/pl-component";

/**
 * หน้ารายการ price list ทั้งหมด
 *
 * รายละเอียด: Server Component ที่ตั้ง metadata title เป็น "Price Lists"
 * แล้ว render `PriceListComponent` ซึ่งดูแลการดึงข้อมูล, ค้นหา, กรอง
 * และแสดงตารางรายการ price list ของ vendor ต่าง ๆ
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้ารายการ price list
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/price-list
 * <PriceListPage />
 * ```
 */
export default function PriceListPage() {
  return <PriceListComponent />;
}

export const Component = PriceListPage;
