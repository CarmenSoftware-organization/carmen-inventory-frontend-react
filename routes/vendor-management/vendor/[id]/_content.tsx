
import { useVendorById } from "@/hooks/use-vendor";
import { VendorForm } from "../_components/vendor-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไขข้อมูล vendor ตาม id ที่ระบุใน URL
 *
 * รายละเอียด: Client Component ที่ unwrap params ด้วย `use()`, ดึงข้อมูล vendor
 * ผ่าน `useVendorById(id)`, แสดง `FormSkeleton` ระหว่างโหลด, `ErrorState`
 * เมื่อเกิด error พร้อมปุ่ม retry, หรือ "Vendor not found" เมื่อไม่พบข้อมูล,
 * เมื่อโหลดสำเร็จจะส่ง `vendor` ให้ `VendorForm` ทำให้อยู่ในโหมด view/edit
 *
 * @param props - properties ของหน้า
 * @param props.params - Promise ของ route params ที่มี `id` ของ vendor
 * @returns React element ของหน้าแก้ไข vendor
 * @example
 * ```tsx
 * // เข้าผ่าน Next.js App Router ที่ path /vendor-management/vendor/abc-123
 * <EditVendorPage params={Promise.resolve({ id: "abc-123" })} />
 * ```
 */
export function EditVendorContent({ id }: { id: string }) {
  const { data: vendor, isLoading, error, refetch } = useVendorById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!vendor) return <ErrorState message="Vendor not found" />;

  return <VendorForm vendor={vendor} />;
}
