
import { useLocationById } from "@/hooks/use-location";
import { LocationForm } from "../_components/location-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าแก้ไข Location ตาม id พร้อมโหลดข้อมูลและจัดการสถานะโหลด/ผิดพลาด
 *
 * ดึงข้อมูลผ่าน `useLocationById` แสดง FormSkeleton ระหว่างโหลด,
 * ErrorState เมื่อผิดพลาด แล้ว render `LocationForm` ในโหมด view
 *
 * @param params - Promise ของ route params ที่มีค่า id
 * @returns React element ของฟอร์มแก้ไข Location
 * @example
 * ```tsx
 * // route: /config/location/[id]
 * <EditLocationPage params={params} />
 * ```
 */
export function EditLocationContent({ id }: { id: string }) {
  const { data: location, isLoading, error, refetch } = useLocationById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!location) return <ErrorState message="Location not found" />;

  return <LocationForm location={location} />;
}
