import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { useInventoryAdjustmentById } from "./use-inventory-adjustment";
import { InventoryAdjustmentForm } from "./ia-form";
import { ErrorState } from "@/components/ui/error-state";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import { FormSkeleton } from "@/components/loader/form-skeleton";

const EditInventoryAdjustmentInner = ({ id }: { id: string }) => {
  const [searchParams] = useSearchParams();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const type = searchParams.get("type") as InventoryAdjustmentType | null;

  if (!type || (type !== "stock-in" && type !== "stock-out")) {
    return <ErrorState message={t("invalidType")} />;
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
  if (error || !inventoryAdjustment)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/inventory-management/inventory-adjustment"
      />
    );

  return (
    <InventoryAdjustmentForm
      adjustmentType={type}
      inventoryAdjustment={inventoryAdjustment}
    />
  );
};

/**
 * หน้าดู/แก้ไข Inventory Adjustment ตาม id — ห่อไว้ใน Suspense พร้อม `FormSkeleton`
 * ชนิดใบ (stock-in / stock-out) อ่านจาก query `?type=` ไม่ใช่จาก path
 *
 * @param props.id - รหัสใบปรับปรุงที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns JSX ของหน้าแก้ไขใบปรับปรุงสต๊อก
 */
export function EditInventoryAdjustmentContent({ id }: { id: string }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditInventoryAdjustmentInner id={id} />
    </Suspense>
  );
}
