import { Suspense } from "react";
import { useSearchParams } from "react-router";
import { useTranslations } from "use-intl";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";
import { InventoryAdjustmentForm } from "./ia-form";
import { ErrorState } from "@/components/ui/error-state";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";

function NewInventoryAdjustmentInner() {
  const [searchParams] = useSearchParams();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const type = searchParams.get("type") as InventoryAdjustmentType | null;

  if (!type || (type !== "stock-in" && type !== "stock-out")) {
    return <ErrorState message={t("invalidType")} />;
  }

  return <InventoryAdjustmentForm adjustmentType={type} />;
}

export function IaNewContent() {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <NewInventoryAdjustmentInner />
    </Suspense>
  );
}
