import { useTranslations } from "use-intl";
import { usePurchaseOrderById } from "../shared/use-purchase-order";
import PoForm from "./po-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function PoEditContent({ id }: { id: string }) {
  const t = useTranslations("procurement.purchaseOrder");
  const {
    data: purchaseOrder,
    isLoading,
    error,
    refetch,
  } = usePurchaseOrderById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !purchaseOrder)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/purchase-order"
      />
    );

  return <PoForm key={purchaseOrder.id} purchaseOrder={purchaseOrder} />;
}
