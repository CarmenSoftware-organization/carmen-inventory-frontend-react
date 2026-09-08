import { useTranslations } from "use-intl";
import { usePurchaseOrderById } from "../shared/use-purchase-order";
import PoForm from "./po-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขใบสั่งซื้อตาม id — ดึงข้อมูลผ่าน `usePurchaseOrderById`
 *
 * @param props.id - รหัส PO ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `PoForm` เมื่อได้ข้อมูล
 */
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
