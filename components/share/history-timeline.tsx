import type { ReactNode } from "react";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

/**
 * จุด marker ของแต่ละก้าว — สีมาจาก token ล้วน จึงสลับ dark mode ได้เอง
 * ไม่ต้องเขียน variant แยก
 */
const MARKER_CLASS = {
  /** เหตุการณ์ล่าสุด (แถวบนสุด) */
  current: "bg-primary",
  /** ก้าวที่ผ่านมาแล้ว */
  default: "bg-border",
  /** จุดกำเนิดเอกสาร เช่น แถวผู้ร้องขอ — วงกลมกลวง */
  origin: "bg-background border-2 border-border",
} as const;

export type HistoryTimelineMarker = keyof typeof MARKER_CLASS;

interface HistoryTimelineProps {
  readonly children: ReactNode;
}

/**
 * รายการไทม์ไลน์ประวัติแบบคอลัมน์เดียว — ราง "วันที่/เวลา" ซ้าย · เส้นกับจุด · เนื้อหาขวา
 *
 * `<ol>` ถือ grid 2 คอลัมน์ไว้เอง แล้ว `<li>` แต่ละตัวใช้ `grid-cols-subgrid`
 * เพื่อให้คอลัมน์วันที่กว้างเท่ากันทุกแถวโดยไม่ต้อง fix ความกว้าง — จำเป็นเพราะ
 * `date_format` มาจาก config ของ BU จะยาวแค่ไหนก็ได้ (`DD/MM/YYYY` หรือ
 * `DD MMMM YYYY`) และ subgrid ยังทำให้ `<li>` เป็น list item จริงในสายตา
 * screen reader ต่างจาก `display: contents`
 *
 * @param props.children - `HistoryTimelineItem` เรียงตามลำดับที่จะแสดง
 * @returns React element ของรายการไทม์ไลน์
 * @example
 * <HistoryTimeline>
 *   <HistoryTimelineItem at={entry.at} marker="current" title={entry.user.name} />
 * </HistoryTimeline>
 */
export function HistoryTimeline({ children }: HistoryTimelineProps) {
  return <ol className="grid grid-cols-[auto_1fr] gap-x-3">{children}</ol>;
}

interface HistoryTimelineItemProps {
  /** ISO datetime — ใช้ทั้งข้อความในรางซ้ายและ attribute `dateTime` */
  readonly at: string;
  /** ชนิดของจุด marker (ค่าเริ่มต้น `default`) */
  readonly marker?: HistoryTimelineMarker;
  /** Badge สถานะที่โมดูลสร้างเอง แสดงหน้าชื่อ */
  readonly badge?: ReactNode;
  /** ชื่อผู้ใช้ — ว่างได้ (บาง entry ของ PO ส่งมาแค่ id ไม่มีชื่อ) */
  readonly title?: ReactNode;
  /** บรรทัดคำอธิบายใต้ชื่อ */
  readonly children?: ReactNode;
}

/**
 * หนึ่งก้าวของไทม์ไลน์ — วันที่/เวลาในรางซ้าย จุด marker บนเส้น แล้วเนื้อหาทางขวา
 *
 * เส้นรางวาดด้วย `border-l` ของคอลัมน์เนื้อหา (ไม่ใช่ element absolute แยก) จึง
 * ต่อกันสนิทเสมอไม่ว่าเนื้อหาจะสูงเท่าไร และ `group-last/hist` ทำให้ก้าวสุดท้าย
 * ไม่มีเส้นห้อยลงมา
 *
 * @param props.at - ISO datetime ของก้าวนี้ (ว่างได้ รางจะว่างแทนที่จะพัง)
 * @param props.marker - ชนิดจุด marker
 * @param props.badge - Badge สถานะ
 * @param props.title - ชื่อผู้ใช้
 * @param props.children - คำอธิบายใต้ชื่อ
 * @returns React element ของหนึ่งก้าว
 */
export function HistoryTimelineItem({
  at,
  marker = "default",
  badge,
  title,
  children,
}: HistoryTimelineItemProps) {
  const { dateFormat } = useProfile();

  // `date_format` ของ BU ใส่ token เวลามาเองได้ (เช่น "DD/MM/YYYY HH:mm") —
  // ต่อ "HH:mm" ทับลงไปอีกจะได้เวลาซ้ำสองที่ในรางเดียว
  const hasTime = dateFormat.includes("HH") || dateFormat.includes("hh");
  const dateLine = formatDate(at, dateFormat);
  const timeLine = hasTime ? "" : formatDate(at, "HH:mm");

  return (
    <li className="group/hist col-span-2 grid grid-cols-subgrid">
      <time
        dateTime={at || undefined}
        className="text-micro text-muted-foreground pt-0.5 text-right leading-tight tabular-nums whitespace-nowrap"
      >
        <span className="block">{dateLine}</span>
        {timeLine && <span className="block">{timeLine}</span>}
      </time>
      <div className="relative border-l pb-5 pl-4 group-last/hist:border-transparent group-last/hist:pb-0">
        <span
          aria-hidden="true"
          className={cn(
            "ring-background absolute top-1.5 left-0 size-2 -translate-x-1/2 rounded-full ring-4",
            MARKER_CLASS[marker],
          )}
        />
        {/* badge อยู่บรรทัดของตัวเอง ชื่อผู้ใช้ลงมาอยู่ใต้ — ในราง 273px ที่
            เหลือหลังหักคอลัมน์วันที่ ชื่อไทยเต็มยศกับ badge ยืนแถวเดียวกันไม่พอ */}
        {badge && <div>{badge}</div>}
        {title && <p className="mt-1 text-sm font-medium">{title}</p>}
        {children && <p className="text-muted-foreground text-xs">{children}</p>}
      </div>
    </li>
  );
}
