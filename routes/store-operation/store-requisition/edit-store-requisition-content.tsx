
import { useTranslations } from "use-intl";
import { useStoreRequisitionById } from "@/hooks/use-store-requisition";
import { StoreRequisitionForm } from "./sr-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function EditStoreRequisitionContent({ id }: { id: string }) {
  const t = useTranslations("storeOperation.storeRequisition");
  const {
    data: storeRequisition,
    isLoading,
    error,
    refetch,
  } = useStoreRequisitionById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!storeRequisition) return <ErrorState message={t("notFound")} />;

  return (
    <StoreRequisitionForm
      key={storeRequisition.updated_at ?? storeRequisition.id}
      storeRequisition={storeRequisition}
    />
  );
}
