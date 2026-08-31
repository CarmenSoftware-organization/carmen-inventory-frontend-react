import { useTranslations } from "use-intl";
import {
  Copy,
  History,
  MessageSquare,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openActivity } from "@/components/share/activity-sheet-host";
import { usePrintDocument } from "@/hooks/use-print-document";
import type {
  PrintDocumentOptions,
  PrintDocumentType,
} from "@/lib/print-document";

interface DocActionsMenuProps {
  /** สร้างใบใหม่จากใบนี้ — ไม่ส่ง = ไม่มีเมนูนี้ (ส่งเฉพาะโหมด view) */
  readonly onDuplicate?: () => void;
  /** เปิด comment sheet — ไม่ส่ง = ไม่มีเมนูนี้ */
  readonly onComment?: () => void;
  /** จำนวน comment — `undefined`/`0` = ไม่มีจุดบนปุ่มและไม่มีเลขในเมนู */
  readonly commentCount?: number;
  /** เปิด activity sheet ของเอกสารนี้ — ไม่ส่ง = ไม่มีเมนูนี้ */
  readonly activity?: { id: string; label?: string };
  /** พิมพ์เอกสาร — ไม่ส่ง = ไม่มีเมนูนี้ (ส่งเฉพาะโหมด view) */
  readonly print?: {
    documentType: PrintDocumentType;
    documentId?: string;
    filters?: PrintDocumentOptions["filters"];
  };
}

/**
 * เมนู ⋯ ของ action รองบนหัวเอกสาร ใช้ร่วมกัน PR/PO/GRN/CN/SR
 *
 * duplicate/comment/activity/print เคยเรียงเป็นปุ่มบนแถบทั้งหมด ซึ่งพอรวมกับ
 * edit/save/cancel/delete แล้วยาวเกินจอ จึงยุบลงมาไว้ที่นี่ เหลือบนแถบเฉพาะ
 * action หลักของโหมดนั้น เมนูไหนไม่ส่ง callback มาก็ไม่แสดง และถ้าไม่มีสักเมนู
 * ก็ไม่ render ปุ่มเลย
 *
 * จำนวน comment ที่เคยอยู่บนปุ่ม ("Comment (3)") กลายเป็นจุดบนปุ่ม ⋯ เพื่อให้ยัง
 * รู้ได้จากข้างนอกว่ามีคนคอมเมนต์ไว้ ส่วนตัวเลขอยู่ในเมนู
 *
 * @param props - คุณสมบัติของเมนู
 * @param props.onDuplicate - callback สร้างใบใหม่จากใบนี้
 * @param props.onComment - callback เปิด comment sheet
 * @param props.commentCount - จำนวน comment ของเอกสาร
 * @param props.activity - id/เลขที่เอกสารสำหรับเปิด activity sheet
 * @param props.print - ชนิด/id/filters ของเอกสารที่จะพิมพ์
 * @returns React element ของเมนู ⋯ หรือ `null` เมื่อไม่มีเมนูให้แสดง
 * @example
 * <DocActionsMenu
 *   onComment={onShowComment}
 *   commentCount={comments?.length}
 *   activity={{ id: po.id, label: po.po_no }}
 *   print={isView ? { documentType: "PO", documentId: po.id } : undefined}
 * />
 */
export function DocActionsMenu({
  onDuplicate,
  onComment,
  commentCount = 0,
  activity,
  print: printDoc,
}: DocActionsMenuProps) {
  const tc = useTranslations("common");
  const tActivity = useTranslations("activity");
  const { print, isPrinting } = usePrintDocument();

  if (!onDuplicate && !onComment && !activity && !printDoc) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <MoreHorizontal aria-hidden="true" />
          {tc("more")}
          {/* มีคนคอมเมนต์ไว้ — จุดเดียวพอให้รู้ว่าต้องเปิดดู เลขอยู่ในเมนู
              อยู่ **ในแถวเดียวกับข้อความ** ไม่ใช่ลอยที่มุมปุ่ม เพราะจุดที่มุมซ้อน
              ขอบปุ่มอยู่ครึ่งหนึ่งเสมอ แล้วอ่านเป็นรอยบุ๋มของปุ่มมากกว่าป้ายแจ้งเตือน
              ท่าแก้มาตรฐานคือคาดวงแหวนสีพื้นหลัง แต่ใน dark mode พื้นหลัง (0.20) กับ
              พื้นปุ่ม outline (~0.28) แทบเป็นสีเดียวกัน วงแหวนเลยมองไม่เห็น
              อยู่ในแถวแล้วไม่มีอะไรให้จม และไม่มีวันโดนกล่องที่ overflow ตัดด้วย */}
          {commentCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary size-1.5 shrink-0 rounded-full"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onDuplicate && (
          <DropdownMenuItem className="cursor-pointer" onSelect={onDuplicate}>
            <Copy className="size-3" />
            {tc("duplicate")}
          </DropdownMenuItem>
        )}
        {/* onSelect ไม่ใช่ onClick — Radix ต้องปิดเมนูและคืน focus ให้เสร็จ
            ก่อน Sheet จะ mount ไม่งั้นสองตัวแย่ง focus กัน */}
        {onComment && (
          <DropdownMenuItem className="cursor-pointer" onSelect={onComment}>
            <MessageSquare className="size-3" />
            {commentCount > 0
              ? `${tc("comment")} (${commentCount})`
              : tc("comment")}
          </DropdownMenuItem>
        )}
        {activity && (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => openActivity(activity.id, activity.label)}
          >
            <History className="size-3" />
            {tActivity("title")}
          </DropdownMenuItem>
        )}
        {printDoc && (
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={isPrinting}
            onSelect={() =>
              void print(printDoc.documentType, {
                documentId: printDoc.documentId,
                filters: printDoc.filters,
              })
            }
          >
            <Printer className="size-3" />
            {tc("print")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
