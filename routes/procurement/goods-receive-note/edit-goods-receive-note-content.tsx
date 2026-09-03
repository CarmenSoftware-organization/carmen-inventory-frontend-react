import { useTranslations } from "use-intl";
import { useGoodsReceiveNoteById } from "@/hooks/use-goods-receive-note";
import { GrnForm } from "./grn-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขใบรับสินค้าตาม id — ดึงข้อมูลผ่าน `useGoodsReceiveNoteById`
 *
 * @param props.id - รหัส GRN ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns `FormSkeleton` ระหว่างโหลด · `ErrorState` เมื่อล้มเหลวหรือไม่พบ · `GrnForm` เมื่อได้ข้อมูล
 */
export function EditGoodsReceiveNoteContent({ id }: { id: string }) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const {
    data: goodsReceiveNote,
    isLoading,
    error,
    refetch,
  } = useGoodsReceiveNoteById(id);

  if (isLoading) return <FormSkeleton />;
  if (error || !goodsReceiveNote)
    return (
      <ErrorState
        error={error}
        notFoundMessage={t("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/goods-receive-note"
      />
    );

  return (
    <GrnForm key={goodsReceiveNote.id} goodsReceiveNote={goodsReceiveNote} />
  );
}
