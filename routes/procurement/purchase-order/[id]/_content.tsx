
import { useTranslations } from "use-intl";
import { usePurchaseOrderById } from "@/hooks/use-purchase-order";
import PoForm from "../_components/po-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขใบสั่งซื้อตาม id ของ PO โดย unwrap `params` แบบ async ตาม
 * มาตรฐาน Next.js 16 แล้วดึงข้อมูลผ่าน `usePurchaseOrderById` จะแสดง
 * `FormSkeleton` ระหว่างโหลด, `ErrorState` เมื่อ fetch ล้มเหลวหรือไม่พบ
 * ข้อมูล และเรนเดอร์ `PoForm` เมื่อมีข้อมูลพร้อมใช้
 *
 * @param props - props ของเพจ
 * @param props.params - Promise ที่ resolve เป็น object `{ id }` ของ PO
 * @returns React element ของฟอร์มแก้ไขใบสั่งซื้อ หรือสถานะ loading/error
 * @example
 * // ถูกเรียกอัตโนมัติโดย Next.js App Router เมื่อเข้า URL
 * // /procurement/purchase-order/abc-123
 * <EditPurchaseOrderPage params={Promise.resolve({ id: "abc-123" })} />
 */
export function EditPurchaseOrderContent({ id }: { id: string }) {
  const t = useTranslations("procurement.purchaseOrder");
  const {
    data: purchaseOrder,
    isLoading,
    error,
    refetch,
  } = usePurchaseOrderById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!purchaseOrder) return <ErrorState message={t("notFound")} />;

  return <PoForm purchaseOrder={purchaseOrder} />;
}
