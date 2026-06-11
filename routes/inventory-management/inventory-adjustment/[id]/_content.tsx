
import { Suspense } from "react";
import { useSearchParams } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { useInventoryAdjustmentById } from "@/hooks/use-inventory-adjustment";
import { InventoryAdjustmentForm } from "../_components/ia-form";
import { ErrorState } from "@/components/ui/error-state";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const EditInventoryAdjustmentInner = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const type = searchParams.get("type") as InventoryAdjustmentType | null;

  if (!type || (type !== "stock-in" && type !== "stock-out")) {
    return (
      <ErrorState message={t("invalidType")} />
    );
  }

  return <EditWithType id={id} type={type} />;
};

const EditWithType = ({
  id,
  type,
}: {
  id: string;
  type: InventoryAdjustmentType;
}) => {
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const {
    data: inventoryAdjustment,
    isLoading,
    error,
    refetch,
  } = useInventoryAdjustmentById(id, type);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!inventoryAdjustment) return <ErrorState message={t("notFound")} />;

  return (
    <InventoryAdjustmentForm
      adjustmentType={type}
      inventoryAdjustment={inventoryAdjustment}
    />
  );
};

/**
 * หน้าแก้ไข/ดู Inventory Adjustment ตาม id ใน route parameters
 * โหลดข้อมูลผ่าน useInventoryAdjustmentById และแสดง skeleton/error ตามสถานะ
 * @param props - พร็อพของ page component
 * @param props.params - Promise ของ route parameters ที่มี id ของ adjustment
 * @returns React element ของหน้าแก้ไข adjustment
 * @example
 * // route: /inventory-management/inventory-adjustment/123?type=stock-in
 * <EditInventoryAdjustmentPage params={Promise.resolve({ id: "123" })} />
 */
export function EditInventoryAdjustmentContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditInventoryAdjustmentInner id={id} />
    </Suspense>
  );
}
