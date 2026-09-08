import { useTranslations } from "use-intl";
import { useRequestPriceListById } from "./use-rfp";
import { RequestPriceListForm } from "./rfp-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * เนื้อหาหลักของหน้าแก้ไข RFP โหลดข้อมูลตาม id และแสดง form
 * @param props - id ของ RFP ที่จะแก้ไข
 * @returns React element ของ content แก้ไข RFP
 * @example
 * <RfpEditContent id="rfp-001" />
 */
export function RfpEditContent({ id }: { id: string }) {
  const tErr = useTranslations("vendorManagement.requestPriceList");
  const {
    data: requestPriceList,
    isLoading,
    error,
    refetch,
  } = useRequestPriceListById(id);

  if (isLoading) return <FormSkeleton />;
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
