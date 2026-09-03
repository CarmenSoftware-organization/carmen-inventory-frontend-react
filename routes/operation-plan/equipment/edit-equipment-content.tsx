import { useTranslations } from "use-intl";
import { useEquipmentById } from "./use-equipment";
import { EquipmentForm } from "./eq-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขอุปกรณ์ ตาม id — ดึงข้อมูลผ่าน `useEquipmentById`
 *
 * @param props.id - รหัสอุปกรณ์ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `EquipmentForm` เมื่อได้ข้อมูล
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
