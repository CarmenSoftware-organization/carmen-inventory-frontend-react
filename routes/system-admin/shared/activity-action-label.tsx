import {
  LogIn,
  LogOut,
  Minus,
  PenLine,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ไอคอน + สีของ action ในบันทึกกิจกรรม
 *
 * สีอ้าง custom property ชุดเดียวกับชิปเดิมใน `styles/badge-status.css` ค่าจึงไม่
 * ดริฟต์ออกจากที่อื่น — แต่ย้ายไปอยู่ที่ **ไอคอน** ที่เดียวตาม DESIGN.md
 * ("avoid neon") ป้ายเป็นสีกลางเสมอ
 */
const ACTION_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  create: { icon: Plus, color: "var(--status-approved)" },
  update: { icon: PenLine, color: "var(--status-pending)" },
  delete: { icon: Trash2, color: "var(--destructive)" },
  login: { icon: LogIn, color: "var(--status-in-progress)" },
  logout: { icon: LogOut, color: "var(--status-draft)" },
};

const FALLBACK = { icon: Minus, color: "var(--muted-foreground)" };

/**
 * action ของบันทึกกิจกรรม แบบ **ไอคอน + ป้าย ไม่มีกรอบชิป**
 *
 * ตารางบันทึกกิจกรรมมีร้อยแถวและ action ซ้ำกันไม่กี่ค่า ชิปทึบร้อยอันเรียงกันจึง
 * กลายเป็นแถบสีที่กลบทุกอย่างในหน้า เหลือไอคอนกับตัวหนังสือแล้วแยกได้จาก **รูปทรง**
 * ไม่ใช่สีอย่างเดียว (คนแยกสีไม่ออกอ่านชิปไม่ได้ถ้าไม่อ่านตัวหนังสือ)
 *
 * ท่าเดียวกับ `StatusIconLabel` ที่คอลัมน์สถานะของตารางอื่นใช้
 *
 * @param props.action - ค่า action ดิบจาก API (`create` / `login` / …)
 * @example
 * <ActivityActionLabel action={row.original.action} />
 */
export function ActivityActionLabel({
  action,
  className,
}: {
  readonly action: string;
  readonly className?: string;
}) {
  const { icon: Icon, color } = ACTION_ICON[action?.toLowerCase()] ?? FALLBACK;

  return (
    // data-slot กัน clamp ของ DataGrid เปลี่ยน span เป็น -webkit-box
    // ซึ่งจะดันไอคอนกับป้ายไปคนละบรรทัด (ดู data-grid-table.tsx)
    <span
      data-slot="action"
      className={cn(
        "text-foreground text-micro inline-flex items-center gap-1.5 tracking-wide whitespace-nowrap",
        className,
      )}
    >
      <Icon
        className="size-3.5 shrink-0"
        style={{ color }}
        aria-hidden="true"
      />
      {action || "—"}
    </span>
  );
}
