import VendorComponent from "./_components/vendor-component";

/**
 * หน้ารายการ vendor ทั้งหมดในระบบ Vendor Management
 *
 * รายละเอียด: เป็น Server Component ที่ตั้งค่า metadata title เป็น "Vendors"
 * แล้ว render `VendorComponent` ซึ่งเป็น client component ที่ดูแลการดึงข้อมูล,
 * ค้นหา, กรอง และตารางรายการ vendor ทั้งหมด
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้ารายการ vendor
 * @example
 * ```tsx
 * // routed via Next.js App Router ที่ path /vendor-management/vendor
 * <VendorPage />
 * ```
 */
export default function VendorPage() {
  return <VendorComponent />;
}

export const Component = VendorPage;
