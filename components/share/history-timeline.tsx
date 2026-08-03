import { createContext, useContext, useMemo, type ReactNode } from "react";
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

interface HistoryTimelineContextValue {
  /** `date_format` ของ BU ปัจจุบัน (จาก `useProfile()`) */
  readonly dateFormat: string;
  /** true ถ้า `dateFormat` มี token เวลาอยู่แล้ว (`HH`/`hh`) */
  readonly hasTime: boolean;
}

const HistoryTimelineContext = createContext<
  HistoryTimelineContextValue | undefined
>(undefined);

/**
 * Hook อ่าน dateFormat/hasTime จาก HistoryTimelineContext
 *
 * Throw error ถ้าถูกเรียกนอก `<HistoryTimeline>` แทนที่จะเงียบแล้วเรนเดอร์
 * รางวันที่ว่างเปล่า — เหมือน `useTimeline` ใน `components/ui/timeline.tsx`
 *
 * @returns ค่า context `{ dateFormat, hasTime }`
 */
function useHistoryTimelineContext() {
  const context = useContext(HistoryTimelineContext);
  if (!context) {
    throw new Error(
      "HistoryTimelineItem must be used within a HistoryTimeline",
    );
  }
  return context;
}

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
  // เรียก useProfile() ที่นี่เพียงครั้งเดียวต่อ sheet — ไม่ใช่ในทุกแถวของ
  // HistoryTimelineItem เพราะ hooks/use-profile.ts เปิด
  // `new BroadcastChannel(BU_SWITCH_CHANNEL)` ใน useEffect ของตัวเอง ถ้าประวัติมี
  // 20 แถวแล้วแต่ละแถวเรียก useProfile() เอง จะกลายเป็น 20 BroadcastChannel +
  // 20 query observer พร้อมกัน และการสลับ BU จากแท็บอื่น 1 ครั้งจะยิง
  // `removeQueries`/`invalidateQueries` ซ้ำทั้งแคช 20 รอบโดยไม่จำเป็น
  const { dateFormat } = useProfile();

  // `date_format` ของ BU ใส่ token เวลามาเองได้ (เช่น "DD/MM/YYYY HH:mm") — ต่อ
  // "HH:mm" ทับลงไปอีกจะได้เวลาซ้ำสองที่ในรางเดียว คำนวณ hasTime ครั้งเดียวที่นี่
  // แล้วส่งลงไปทุกแถวผ่าน context แทนที่จะคำนวณซ้ำทุกแถว (ค่าเดียวกันทั้งไทม์ไลน์)
  const hasTime = dateFormat.includes("HH") || dateFormat.includes("hh");

  const contextValue = useMemo<HistoryTimelineContextValue>(
    () => ({ dateFormat, hasTime }),
    [dateFormat, hasTime],
  );

  return (
    <HistoryTimelineContext.Provider value={contextValue}>
      <ol role="list" className="grid grid-cols-[auto_1fr] gap-x-3">
        {children}
      </ol>
    </HistoryTimelineContext.Provider>
  );
}

export interface HistoryTimelineItemProps {
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
  const { dateFormat, hasTime } = useHistoryTimelineContext();

  const dateLine = formatDate(at, dateFormat);
  const timeLine = hasTime ? "" : formatDate(at, "HH:mm");
  // dateLine ว่างแปลว่า `at` parse เป็นวันที่ไม่ได้ (ดู formatDate) — attribute
  // `dateTime` ต้องไม่ใส่ค่าที่ไม่ valid ไปด้วย ปล่อยเป็น undefined แทน
  const dateTimeAttr = dateLine ? at : undefined;

  return (
    <li className="group/hist col-span-2 grid grid-cols-subgrid">
      <time
        dateTime={dateTimeAttr}
        className="text-micro text-muted-foreground pt-0.5 text-right leading-tight tabular-nums whitespace-nowrap"
      >
        <span className="block">{dateLine}</span>
        {timeLine && <span className="block">{timeLine}</span>}
      </time>
      <div className="relative min-w-0 border-l pb-5 pl-4 group-last/hist:border-transparent group-last/hist:pb-0">
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
