
import { useDepartmentById } from "@/hooks/use-department";
import { DepartmentForm } from "../_components/department-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข Department ตาม id พร้อมโหลดข้อมูลและจัดการสถานะโหลด/ผิดพลาด
 *
 * ดึงข้อมูลผ่าน `useDepartmentById` แสดง FormSkeleton ระหว่างโหลด,
 * ErrorState เมื่อผิดพลาด แล้ว render `DepartmentForm` ในโหมด view
 *
 * @param params - Promise ของ route params ที่มีค่า id
 * @returns React element ของฟอร์มแก้ไข Department
 * @example
 * ```tsx
 * // route: /config/department/[id]
 * <EditDepartmentPage params={params} />
 * ```
 */
export function EditDepartmentContent({ id }: { id: string }) {
  const { data: department, isLoading, error, refetch } = useDepartmentById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!department) return <ErrorState message="Department not found" />;

  return <DepartmentForm department={department} />;
}
