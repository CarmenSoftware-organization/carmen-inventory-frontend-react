import { useTranslations } from "use-intl";
import { useRequestPriceListById } from "./use-rfp";
import { RequestPriceListForm } from "./rfp-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormPageSkeleton } from "@/components/loader/form-page-skeleton";

export function RfpEditContent({ id }: { id: string }) {
  const tErr = useTranslations("vendorManagement.requestPriceList");
  const {
    data: requestPriceList,
    isLoading,
    error,
    refetch,
  } = useRequestPriceListById(id);

  if (isLoading) return <FormPageSkeleton width="wide" />;
  if (error || !requestPriceList)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/vendor-management/request-price-list"
      />
    );

  return <RequestPriceListForm requestPriceList={requestPriceList} />;
}
