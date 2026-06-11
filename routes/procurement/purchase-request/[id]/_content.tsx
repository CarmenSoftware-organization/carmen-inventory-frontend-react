
import { useTranslations } from "use-intl";
import { usePurchaseRequestById } from "@/hooks/use-purchase-request";
import { PurchaseRequestForm } from "../_components/pr-form";
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
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!purchaseRequest) return <ErrorState message={t("notFound")} />;

  return <PurchaseRequestForm purchaseRequest={purchaseRequest} />;
}
