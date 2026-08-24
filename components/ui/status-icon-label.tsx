import {
  Archive,
  Ban,
  Check,
  Clock,
  Flag,
  Lock,
  Minus,
  PenLine,
  Percent,
  Save,
  Send,
  Unlock,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ไอคอนกับสีของแต่ละสถานะ — สัญลักษณ์เปล่า ไม่มีวงกลมกำกับ เพราะวงกลมกินพื้นที่
 * ไปกับเส้นขอบที่ไม่ได้บอกอะไร เหลือแต่ตัวสัญลักษณ์ที่พนักงานหน้างานอ่านออกทันที:
 * ดินสอ = ยังร่าง · นาฬิกา = รออยู่ · เครื่องบิน = ส่งออกไปแล้ว · เปอร์เซ็นต์ = มา
 * บางส่วน · ติ๊ก = ผ่านแล้ว · ธง = ถึงปลายทางแล้ว · กล่องเก็บ = ปิดใบแล้ว ·
 * แผ่นบันทึก = บันทึกไว้ · กุญแจ = ยืนยันแล้วแก้ไม่ได้ · ห้าม = ยกเลิก ·
 * กากบาท = ไม่อนุมัติ
 *
 * `completed` ใช้ธงไม่ใช่ติ๊กซ้อน เพราะมันไม่ใช่ "อนุมัติแรงกว่า approved" แต่เป็น
 * คนละเรื่อง — จบทั้งกระบวนการแล้ว ติ๊กสองอันข้างติ๊กอันเดียวอ่านเป็นระดับของ
 * สิ่งเดียวกัน ซึ่งทำให้เข้าใจผิด
 *
 * สีอ้าง custom property ชุดเดียวกับ dot chip เดิมใน `styles/badge-status.css`
 * ตัวสถานะจึงไม่เปลี่ยนสีเมื่อสลับไปหน้าที่ยังใช้ chip
 */
const STATUS_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  draft: { icon: PenLine, color: "var(--status-draft)" },
  in_progress: { icon: Clock, color: "var(--status-in-progress)" },
  approved: { icon: Check, color: "var(--status-approved)" },
  completed: { icon: Flag, color: "var(--status-completed)" },
  /* PO — ใบสั่งซื้อเดินต่อจากอนุมัติแล้ว: ส่งให้ผู้ขาย → ของมาบางส่วน → ปิดใบ */
  sent: { icon: Send, color: "var(--status-sent)" },
  partial: { icon: Percent, color: "var(--status-partial)" },
  closed: { icon: Archive, color: "var(--status-closed)" },
  /* GRN — ใบรับของไม่มี workflow: บันทึกไว้ก่อน แล้วค่อยยืนยันตัดสต๊อกจริง */
  saved: { icon: Save, color: "var(--status-save)" },
  save: { icon: Save, color: "var(--status-save)" },
  committed: { icon: Lock, color: "var(--status-committed)" },
  /* รอบบัญชี — เปิดรับรายการ → ปิดรอบ → ล็อกถาวร */
  open: { icon: Unlock, color: "var(--status-open)" },
  locked: { icon: Lock, color: "var(--status-locked)" },
  voided: { icon: Ban, color: "var(--status-voided)" },
  rejected: { icon: X, color: "var(--status-rejected)" },
  cancelled: { icon: Ban, color: "var(--status-cancelled)" },
};

const FALLBACK = { icon: Minus, color: "var(--status-draft)" };

/**
 * ไอคอน + สีของสถานะหนึ่งค่า — ให้ที่อื่นหยิบไปใช้โดยไม่ต้องผ่าน `StatusIconLabel`
 * (ตัวกรองในรายการใช้ตัวนี้เพื่อให้ไอคอนในเมนูตรงกับที่เห็นในตาราง)
 *
 * @param status - ค่า status ดิบ
 * @returns ไอคอนกับสีของสถานะนั้น หรือค่าสำรองเมื่อไม่รู้จัก
 */
export function getStatusIcon(status: string) {
  return STATUS_ICON[status] ?? FALLBACK;
}

interface StatusIconLabelProps {
  /** ค่า status ดิบจาก API (lowercase, snake_case) */
  readonly status: string;
  /** ป้ายที่แสดง — ตัวเรียกส่งมาจาก config ของโมดูลตัวเอง */
  readonly label: string;
  readonly className?: string;
}

/**
 * สถานะแบบ **ไอคอน + ป้ายตัวใหญ่ ไม่มีกรอบ chip**
 *
 * ต่างจาก `StatusDotBadge` ตรงที่ไม่มีพื้น `bg-muted` ล้อม — ตารางสิบแถวจึงไม่กลาย
 * เป็นก้อนเทาสิบก้อน และแยกสถานะได้จาก **รูปทรงของไอคอน** ไม่ใช่สีอย่างเดียว
 * (จุดสีล้วนพึ่งสี 100% คนแยกสีไม่ออกอ่านไม่ได้ถ้าไม่อ่านตัวหนังสือ)
 *
 * สีอยู่ที่ไอคอนจุดเดียวตาม DESIGN.md ("avoid neon") ส่วนป้ายเป็นสีกลางเสมอ
 *
 * @param props.status - ค่า status ดิบ ใช้เลือกไอคอน/สี
 * @param props.label - ป้ายที่แสดง (มาจาก `createStatusConfig` ซึ่ง uppercase ให้แล้ว)
 * @returns React element ของสถานะ
 * @example
 * <StatusIconLabel status={pr.pr_status} label={config.label} />
 */
export function StatusIconLabel({
  status,
  label,
  className,
}: StatusIconLabelProps) {
  const { icon: Icon, color } = getStatusIcon(status);

  return (
    <span
      // `data-slot` ไม่ใช่ของประดับ — กล่อง clamp ของ DataGrid ยกเว้นลูกที่มี
      // attribute นี้ (ดู data-grid-table.tsx) ถ้าไม่มี span ตัวนี้จะโดนเปลี่ยนเป็น
      // -webkit-box แล้วไอคอนกับป้ายแยกกันคนละบรรทัด
      data-slot="status"
      className={cn(
        "text-foreground inline-flex items-center gap-1.5 tracking-wide whitespace-nowrap",
        className,
      )}
    >
      <Icon
        className="size-3.5 shrink-0"
        style={{ color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
