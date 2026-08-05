import { useTranslations } from "use-intl";
import { usePriceListById } from "@/hooks/use-price-list";
import { PriceListForm } from "./pl-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function EditPriceListContent({ id }: { id: string }) {
  const tErr = useTranslations("vendorManagement.priceList");
  const { data: priceList, isLoading, error, refetch } = usePriceListById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !priceList)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/vendor-management/price-list"
      />
    );

  return <PriceListForm priceList={priceList} />;
}
