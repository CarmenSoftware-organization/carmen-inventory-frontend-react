import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { useDocSequence } from "@/hooks/use-doc-sequence";

/**
 * ปุ่ม ↑↓ + "3/12" บนหัวหน้า detail — เดินไปใบ ก่อนหน้า/ถัดไป ตามลำดับของ
 * list ที่เพิ่งเปิดมา (สไตล์ Linear: คนอนุมัติไล่เคลียร์ my-pending ได้ทั้งชุด
 * โดยไม่ต้องเด้งกลับ list ทุกใบ)
 *
 * render ตัวเองเฉพาะเมื่อ detail ปัจจุบันอยู่ในลำดับที่ list ประกาศไว้
 * (useDocSequence คืน null = เข้าตรงจาก deep link/Recent → ไม่มี nav) —
 * DocFormHeader mount ตัวนี้ให้ทุกหน้า detail อยู่แล้ว ไม่ต้อง wiring รายหน้า
 * ฝั่ง list แค่เรียก useRecordDocSequence(ids) ก็ได้ nav ฟรี
 *
 * ตอน edit ค้างอยู่แล้วกด ↑↓ — navigation guard ของฟอร์มเด้งถาม discard
 * ตามปกติ ไม่ต้องกันเพิ่มที่นี่
 */
export function DocSequenceNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tc = useTranslations("common");
  const seq = useDocSequence(pathname);

  if (!seq) return null;

  return (
    <div className="flex shrink-0 items-center">
      <span className="text-muted-foreground text-micro me-1 tabular-nums">
        {seq.index + 1}/{seq.total}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!seq.prevPath}
        aria-label={tc("previous")}
        onClick={() => seq.prevPath && navigate(seq.prevPath)}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={!seq.nextPath}
        aria-label={tc("next")}
        onClick={() => seq.nextPath && navigate(seq.nextPath)}
      >
        <ChevronDown />
      </Button>
    </div>
  );
}
