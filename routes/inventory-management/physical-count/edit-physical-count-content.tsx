import { useTranslations } from "use-intl";
import { usePhysicalCountById } from "../shared/use-physical-count";
import { PcForm } from "./pc-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import type { PhysicalCount } from "@/types/physical-count";

/**
 * หน้าแก้ไข Physical Count ตาม id
 * โหลด entity ผ่าน usePhysicalCountById แล้วส่งเข้า PcForm
 *
 * @param props - { id } จาก route param ที่ unwrap แล้วใน page.tsx
 * @returns React element ของหน้าแก้ไข physical count
 * @example
 * // URL: /inventory-management/physical-count/abc-123 → id = "abc-123"
 */
export function EditPhysicalCountContent({ id }: Readonly<{ id: string }>) {
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
