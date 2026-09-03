import { useTranslations } from "use-intl";
import { usePurchaseRequestById } from "./use-purchase-request";
import { PurchaseRequestForm } from "./pr-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function EditPurchaseRequestContent({ id }: { id: string }) {
  const t = useTranslations("procurement.purchaseRequest");
  const {
    data: purchaseRequest,
    isLoading,
    error,
    refetch,
  } = usePurchaseRequestById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !purchaseRequest)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/purchase-request"
      />
    );

  return <PurchaseRequestForm key={purchaseRequest.id} purchaseRequest={purchaseRequest} />;
}
