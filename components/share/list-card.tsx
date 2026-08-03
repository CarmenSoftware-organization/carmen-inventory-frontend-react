import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { AuditEntry } from "@/types/audit";

/**
 * Skeleton ที่ mirror โครง `ListCard` — ใช้ตอนโหลดให้ความสูงใกล้ของจริง
 *
 * @param rows - จำนวนแถวข้อมูลที่จะโชว์เป็นโครง (default 5)
 * @param hasFooter - การ์ดจริงมี footer action หรือไม่
 */
export function ListCardSkeleton({
  rows = 5,
  hasFooter = true,
}: {
  readonly rows?: number;
  readonly hasFooter?: boolean;
}) {
  return (
    <div className="bg-card animate-pulse overflow-hidden rounded-xl border">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <div className="border-t" />
      <div className="space-y-2 px-3.5 py-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={`row-${i}`}
            className="flex items-center justify-between gap-3"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {hasFooter && (
        <>
          <div className="border-t" />
          <div className="flex items-center justify-end px-2 py-1.5">
            <Skeleton className="h-6 w-9" />
          </div>
        </>
      )}
    </div>
  );
}

interface ListCardProps {
  /** เลขที่เอกสาร/ชื่อรายการ — หัวการ์ด */
  readonly title: ReactNode;
  /** badge สถานะมุมขวาบน (แต่ละโมดูลมี config สีของตัวเอง) */
  readonly badge?: ReactNode;
  /** คลิกการ์ด/กด Enter — เข้าหน้ารายละเอียด */
  readonly onOpen: () => void;
  /** ส่งมาแล้วได้ปุ่มลบมาตรฐานท้าย footer; ไม่ส่ง = ลบไม่ได้ */
  readonly onDelete?: () => void;
  /** ปุ่มอื่นใน footer (วางก่อนปุ่มลบ) เช่น approve/reject ของ PR */
  readonly actions?: ReactNode;
  /** แถวข้อมูล — ใช้ `ListCardRow` */
  readonly children: ReactNode;
}

/**
 * แถวข้อมูล label/value ในการ์ดรายการ — label ชิดซ้าย ค่าชิดขวา
 *
 * ค่าตัดบรรทัดได้ (ไม่ truncate) เพราะข้อมูลในการ์ดต้องครบเท่าคอลัมน์ในตาราง
 */
export function ListCardRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 text-end font-medium break-words">{children}</div>
    </div>
  );
}

/**
 * สามแถวท้ายการ์ด: วันที่สร้าง · ผู้สร้าง · วันที่แก้ล่าสุด
 *
 * ทุกโมดูลปิดท้ายการ์ดด้วยชุดนี้เหมือนกันหมด จึงเป็น component เดียวไม่ใช่ children
 * (ต่างจากแถวข้อมูลอื่นที่รูปแบบค่าเป็นของใครของมัน) — อ่าน `dateTimeFormat` ของ BU
 * กับ label เอง ผู้เรียกส่งมาแค่ `audit`
 *
 * @param audit - `item.audit` ของแถวนั้น (ไม่มีข้อมูล = ไม่ render อะไรเลย)
 * @example
 * <ListCard title={item.name} onOpen={…}>
 *   <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>
 *   <ListCardAuditRows audit={item.audit} />
 * </ListCard>
 */
export function ListCardAuditRows({
  audit,
}: {
  readonly audit?: { created?: AuditEntry; updated?: AuditEntry };
}) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  return (
    <>
      {audit?.created?.at && (
        <ListCardRow label={tfl("created")}>
          <span className="tabular-nums">
            {formatDate(audit.created.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
      {audit?.created?.name && (
        <ListCardRow label={tfl("by")}>{audit.created.name}</ListCardRow>
      )}
      {audit?.updated?.at && (
        <ListCardRow label={tfl("updated")}>
          <span className="tabular-nums">
            {formatDate(audit.updated.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
    </>
  );
}

/**
 * การ์ด 1 รายการในหน้า list (โหมด grid/mobile) — โครงกลางของ PR/SR/IA
 *
 * ตัวนี้ถือเฉพาะ "เปลือก" ที่ทุกโมดูลเหมือนกันและเป็นที่ที่พลาดกันซ้ำ ๆ:
 * - chrome ของการ์ด + `role="button"`/tabIndex/Enter-Space และ guard
 *   `closest("button")` (กดปุ่มใน footer แล้วไม่เด้งเข้าหน้ารายละเอียด)
 * - header: title `min-w-0 truncate` + badge ชิดขวา — ฝั่งซ้ายยุบเองเวลาการ์ด
 *   แคบ badge จึงไม่ทะลุขอบ (เคยเป็นบั๊กในการ์ด SR)
 * - body: `flex-1 content-start` ให้เนื้ออมที่ว่างของการ์ดที่ถูกกริดยืดสูงเท่า
 *   ใบสูงสุดในแถว ไม่งั้น footer ลอยค้างคนละระดับกันทุกใบ
 * - footer: โผล่เฉพาะเมื่อมี action จริง
 *
 * ส่วนแถวข้อมูลปล่อยเป็น children ไม่ทำเป็น prop `rows[]` เพราะค่าแต่ละแถวมี
 * รูปแบบของตัวเอง (สี/semibold/tabular-nums/สกุลเงินต่อท้าย) และมีเงื่อนไขว่า
 * จะโชว์หรือไม่ — ยัดเป็น array แล้วต้อง filter ทิ้งเอง เขียนยากกว่าเดิม
 *
 * @example
 * <ListCard title={item.sr_no} badge={<Badge …/>} onOpen={…} onDelete={…}>
 *   <ListCardRow label={tfl("date")}>{formatDate(item.sr_date, dateFormat)}</ListCardRow>
 * </ListCard>
 */
export function ListCard({
  title,
  badge,
  onOpen,
  onDelete,
  actions,
  children,
}: ListCardProps) {
  const tc = useTranslations("common");

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onOpen();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const hasFooter = !!actions || !!onDelete;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="hover:border-primary/40 focus-visible:ring-ring cursor-pointer gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <CardHeader className="gap-0 px-3.5 py-3">
        {/* min-w-0 ต้องมีทั้งตัวนี้และตัว title — CardHeader เป็น grid ที่คอลัมน์
            กว้างตาม min-content ของลูก ถ้าแถวนี้ไม่ยอมยุบ ชื่อยาว ๆ จะดันทั้งแถว
            กว้างเกินการ์ด (badge ถูกเบียดหลุดไปขวา) แล้ว truncate ของ title
            ก็ไม่มีโอกาสทำงานเลย */}
        <div className="flex min-w-0 items-start justify-between gap-2">
          {/* ยาวเกินการ์ด = ตัดท้ายด้วย … (ไม่ตัดคำขึ้นบรรทัดใหม่ ไม่งั้นความสูง
              หัวการ์ดไม่เท่ากันทั้งกริด) · ชื่อที่เป็น string ใส่ title ให้ hover
              อ่านเต็มได้ เพราะไม่มีทางอื่นให้เห็นส่วนที่ถูกตัด */}
          <CardTitle
            className="min-w-0 truncate text-sm"
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </CardTitle>
          {badge}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="grid flex-1 content-start gap-1.5 px-3.5 py-3 text-xs">
        {children}
      </CardContent>

      {hasFooter && (
        <>
          <Separator />
          <CardFooter className="justify-end gap-1.5 px-2 py-1.5">
            {actions}
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 aria-hidden="true" />
                {tc("delete")}
              </Button>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
