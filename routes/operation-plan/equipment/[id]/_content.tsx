
import { useEquipmentById } from "@/hooks/use-equipment";
import { EquipmentForm } from "../_components/eq-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าสำหรับแก้ไขข้อมูลอุปกรณ์ที่มีอยู่
 * @param props - params ที่มี id ของอุปกรณ์
 * @returns React element ของหน้าแก้ไขอุปกรณ์
 * @example
 * // route: /operation-plan/equipment/abc-123
 * <EditEquipmentPage params={Promise.resolve({ id: "abc-123" })} />
 */
export function EditEquipmentContent({ id }: { id: string }) {
  const { data: equipment, isLoading, error, refetch } = useEquipmentById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!equipment) return <ErrorState message="Equipment not found" />;

  return <EquipmentForm equipment={equipment} />;
}
