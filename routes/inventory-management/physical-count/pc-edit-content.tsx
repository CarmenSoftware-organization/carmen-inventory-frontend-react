import { useTranslations } from "use-intl";
import { usePhysicalCountById } from "../shared/use-physical-count";
import { PcForm } from "./pc-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import type { PhysicalCount } from "@/types/physical-count";

/**
 * หน้าดู/แก้ไข Physical Count ตาม id — ดึงข้อมูลผ่าน `usePhysicalCountById`
 *
 * @param props.id - รหัสใบตรวจนับที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `PcForm` เมื่อได้ข้อมูล
 */
export function PcEditContent({ id }: Readonly<{ id: string }>) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const {
    data: physicalCount,
    isLoading,
    error,
    refetch,
  } = usePhysicalCountById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !physicalCount)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/inventory-management/physical-count"
      />
    );

  return <PcForm physicalCount={physicalCount as unknown as PhysicalCount} />;
}
