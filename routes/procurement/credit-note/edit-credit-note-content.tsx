
import { useCreditNoteById } from "@/hooks/use-credit-note";
import { CnForm } from "./cn-form";
import { ErrorState } from "@/components/ui/error-state";
import { FormSkeleton } from "@/components/loader/form-skeleton";

/**
 * หน้าดู/แก้ไขใบลดหนี้ตาม id ที่ระบุใน URL
 * โหลดข้อมูล credit note ผ่าน `useCreditNoteById`, แสดง skeleton ระหว่างโหลด, แสดง `ErrorState` เมื่อ error หรือไม่พบข้อมูล และส่งต่อให้ `CnForm` เมื่อได้ข้อมูลสมบูรณ์
 *
 * @param props - object จาก Next.js App Router
 * @param props.params - Promise ที่ resolve เป็น `{ id: string }` ซึ่งเป็นรหัสใบลดหนี้จาก URL segment
 * @returns React element ของ skeleton, error state หรือฟอร์มใบลดหนี้
 *
 * @example
 * // Next.js เรียกใช้งานอัตโนมัติเมื่อเปิด URL /procurement/credit-note/cn-001
 * // params จะ resolve เป็น { id: "cn-001" }
 */
export function EditCreditNoteContent({ id }: { id: string }) {
  const { data: creditNote, isLoading, error, refetch } = useCreditNoteById(id);

  if (isLoading) return <FormSkeleton />;
  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!creditNote) return <ErrorState message="Credit note not found" />;

  return <CnForm creditNote={creditNote} />;
}
