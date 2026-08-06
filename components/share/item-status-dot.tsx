import { type ReactNode } from "react";
import { Clock, Check, X, Eye, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * ไอคอนในวงกลมสีทึบ — สีจาก semantic token ใน globals.css
 *
 * bg สว่าง (info/success/warning) ใช้ไอคอนสีดำ อ่านชัดกว่า `*-foreground`
 * ซึ่งถูกจูนไว้สำหรับพื้นเข้ม
 */
const STATUS_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: "bg-info text-black" },
  approved: { icon: Check, className: "bg-success text-black" },
  rejected: { icon: X, className: "bg-destructive text-destructive-foreground" },
  review: { icon: Eye, className: "bg-warning text-black" },
};

/**
 * สถานะรายการในตารางเอกสาร — จุดกลมมีไอคอน ชื่อสถานะอยู่ใน tooltip
 *
 * ใช้ร่วมกันระหว่าง PR กับ PO ซึ่งมีชุดสถานะเดียวกัน (pending/approved/
 * rejected/review) · เป็นจุดไม่ใช่ badge ข้อความ เพราะคอลัมน์นี้อยู่ในแถวที่
 * หนาแน่นและถูกกวาดตาผ่านเป็นสิบ ๆ แถว — ป้ายข้อความยาวกินที่และดังกว่าตัวเลข
 * ที่คนกำลังหาอยู่ ส่วนชื่อเต็มยังอ่านได้เมื่อต้องการจริง ๆ
 *
 * @param status - สถานะที่ normalize แล้ว (pending/approved/rejected/review)
 * @param label - ชื่อสถานะสำหรับ tooltip และ aria-label
 * @param tooltipExtra - ปุ่มเสริมใน tooltip (เช่นปุ่มล้างสถานะของ PR)
 */
export function ItemStatusDot({
  status,
  label,
  tooltipExtra,
}: {
  readonly status: string;
  readonly label: string;
  readonly tooltipExtra?: ReactNode;
}) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  const Icon = style.icon;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full",
              style.className,
            )}
            aria-label={label}
          >
            <Icon className="size-2.5" strokeWidth={2.75} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{label}</span>
          {tooltipExtra}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
