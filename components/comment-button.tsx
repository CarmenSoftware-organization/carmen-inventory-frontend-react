import { useTranslations } from "use-intl";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentButtonProps {
  /** จำนวน comment — `undefined` (ยังโหลดไม่เสร็จ/โหลดไม่สำเร็จ) หรือ `0` จะไม่แสดงเลข */
  readonly count?: number;
  readonly onClick: () => void;
}

/**
 * ปุ่มเปิด comment sheet ใช้ร่วมกันระหว่าง PR/PO/GRN/SR/CN
 *
 * แสดงจำนวน comment ต่อท้าย label เช่น "Comment (3)" โดยซ่อนเลขเมื่อ `count`
 * เป็น `undefined` หรือ `0` — ระหว่างโหลดปุ่มจึงขึ้นแค่ "Comment" แล้วค่อยโผล่
 * เลขออกมาโดยไม่ทำให้ layout กระตุก
 * @param props - คุณสมบัติของปุ่ม
 * @param props.count - จำนวน comment ของเอกสาร
 * @param props.onClick - callback เปิด comment sheet
 * @returns React element ของปุ่ม comment
 * @example
 * const { data: comments } = useGoodsReceiveNoteComments(grn?.id);
 * <CommentButton count={comments?.length} onClick={onShowComment} />
 */
export function CommentButton({ count, onClick }: CommentButtonProps) {
  const tc = useTranslations("common");
  const label = count ? `${tc("comment")} (${count})` : tc("comment");

  return (
    <Button type="button" size="sm" variant="info" onClick={onClick}>
      <MessageSquare aria-hidden="true" />
      {label}
    </Button>
  );
}
