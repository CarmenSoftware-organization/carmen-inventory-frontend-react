import { useCreditNoteById } from "./use-credit-note";
import { useTranslations } from "use-intl";
import { CnForm } from "./cn-form";
import { ErrorState } from "@/components/ui/error-state";
import { DocFormSkeleton } from "@/components/loader/doc-form-skeleton";

/**
 * หน้าดู/แก้ไขใบลดหนี้ตาม id ที่ระบุใน URL
 * โหลดข้อมูล credit note ผ่าน `useCreditNoteById`, แสดง skeleton ระหว่างโหลด, แสดง `ErrorState` เมื่อ error หรือไม่พบข้อมูล และส่งต่อให้ `CnForm` เมื่อได้ข้อมูลสมบูรณ์
 *
 * @param props.id - รหัสใบลดหนี้ที่ route อ่านมาจาก URL segment (`useParams`)
 * @returns React element ของ skeleton, error state หรือฟอร์มใบลดหนี้
 */
export function CnEditContent({ id }: { id: string }) {
  const tErr = useTranslations("procurement.creditNote");
  const { data: creditNote, isLoading, error, refetch } = useCreditNoteById(id);

  if (isLoading) return <DocFormSkeleton />;
  if (error || !creditNote)
    return (
      <ErrorState
        error={error}
        notFoundMessage={tErr("notFound")}
        onRetry={() => refetch()}
        backTo="/procurement/credit-note"
      />
    );

  return <CnForm key={creditNote.id} creditNote={creditNote} />;
}
