
import { usePriceListById } from "@/hooks/use-price-list";
import { PriceListForm } from "../_components/pl-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

export function EditPriceListContent({ id }: { id: string }) {
  const { data: priceList, isLoading, error, refetch } = usePriceListById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!priceList) return <ErrorState message="Price list not found" />;

  return <PriceListForm priceList={priceList} />;
}
