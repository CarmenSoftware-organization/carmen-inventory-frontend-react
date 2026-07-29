import { useParams } from "react-router";
import { useTranslations } from "use-intl";
import { usePurchaseRequestById } from "@/hooks/use-purchase-request";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";
import { PurchaseRequestFormV2 } from "./pr2-form";

/**
 * หน้าใบขอซื้อแบบใหม่ (v2) — อยู่คนละ route กับของเดิมโดยตั้งใจ
 * เปิดสองแท็บเทียบกันได้ และถ้าไม่เอาก็ลบทั้งโฟลเดอร์ v2 ทิ้งได้เลย
 */
export function Component() {
  const t = useTranslations("procurement.purchaseRequest");
  const { id } = useParams<{ id: string }>();
  const {
    data: purchaseRequest,
    isLoading,
    error,
    refetch,
  } = usePurchaseRequestById(id ?? "");

  if (!id) return null;
  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!purchaseRequest) return <ErrorState message={t("notFound")} />;

  return <PurchaseRequestFormV2 purchaseRequest={purchaseRequest} />;
}
