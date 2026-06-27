
import { useTranslations } from "use-intl";
import { useGoodsReceiveNoteById } from "@/hooks/use-goods-receive-note";
import { GrnForm } from "./grn-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขใบรับสินค้าตาม id ที่ระบุใน URL
 * unwrap params Promise ด้วย use() ตาม Next.js 16
 * โหลด GRN ผ่าน useGoodsReceiveNoteById แล้ว render GrnForm
 * แสดง FormSkeleton ระหว่างโหลด และ ErrorState เมื่อเกิดข้อผิดพลาด
 *
 * @param props - props ของ page
 * @param props.params - Promise ของ { id } จาก App Router
 * @returns React element ของหน้า
 * @example
 * // Accessed via URL: /procurement/goods-receive-note/123
 */
export function EditGoodsReceiveNoteContent({ id }: { id: string }) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const { data: goodsReceiveNote, isLoading, error, refetch } = useGoodsReceiveNoteById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!goodsReceiveNote) return <ErrorState message={t("notFound")} />;

  return <GrnForm goodsReceiveNote={goodsReceiveNote} />;
}
