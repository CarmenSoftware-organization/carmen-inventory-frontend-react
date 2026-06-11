
import { Suspense } from "react";
import { useSearchParams } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { InventoryAdjustmentForm } from "../_components/ia-form";
import { ErrorState } from "@/components/ui/error-state";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";

function NewInventoryAdjustmentInner() {
  const searchParams = useSearchParams();
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const type = searchParams.get("type") as InventoryAdjustmentType | null;

  if (!type || (type !== "stock-in" && type !== "stock-out")) {
    return <ErrorState message={t("invalidType")} />;
  }

  return <InventoryAdjustmentForm adjustmentType={type} />;
}

export function NewInventoryAdjustmentContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewInventoryAdjustmentInner />
    </Suspense>
  );
}
