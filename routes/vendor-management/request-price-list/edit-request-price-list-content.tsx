
import { useRequestPriceListById } from "@/hooks/use-request-price-list";
import { RequestPriceListForm } from "./rfp-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * เนื้อหาหลักของหน้าแก้ไข RFP โหลดข้อมูลตาม id และแสดง form
 * @param props - id ของ RFP ที่จะแก้ไข
 * @returns React element ของ content แก้ไข RFP
 * @example
 * <EditRequestPriceListContent id="rfp-001" />
 */
export function EditRequestPriceListContent({ id }: { id: string }) {
  const {
    data: requestPriceList,
    isLoading,
    error,
    refetch,
  } = useRequestPriceListById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!requestPriceList)
    return <ErrorState message="Request price list not found" />;

  return <RequestPriceListForm requestPriceList={requestPriceList} />;
}
