import { useTranslations } from "use-intl";
import { useEquipmentById } from "@/hooks/use-equipment";
import { EquipmentForm } from "./eq-form";
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
  const tErr = useTranslations("operationPlan.equipment");
  const { data: equipment, isLoading, error, refetch } = useEquipmentById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !equipment)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/operation-plan/equipment"
      />
    );

  return <EquipmentForm equipment={equipment} />;
}
