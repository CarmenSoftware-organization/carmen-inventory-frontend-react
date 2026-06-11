import { VendorForm } from "../_components/vendor-form";

/**
 * หน้าแบบฟอร์มสร้าง vendor ใหม่
 *
 * รายละเอียด: Server Component ที่ render `VendorForm` โดยไม่ส่ง prop vendor
 * ทำให้ฟอร์มอยู่ในโหมด add — กรอกข้อมูลแล้วกด save จะสร้าง vendor ใหม่
 *
 * @param - ไม่มี parameter
 * @returns React element ของหน้าสร้าง vendor ใหม่
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/vendor/new
 * <NewVendorPage />
 * ```
 */
export default function NewVendorPage() {
  return <VendorForm />;
}

export const Component = NewVendorPage;
