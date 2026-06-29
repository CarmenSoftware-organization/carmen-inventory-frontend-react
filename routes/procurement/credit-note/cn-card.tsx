import { CalendarDays, Store, FileText, Tag } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { CreditNote } from "@/types/credit-note";
import { CN_STATUS_CONFIG, CN_TYPE_CONFIG } from "@/constant/credit-note";

interface CnCardProps {
  readonly item: CreditNote;
  readonly index?: number;
  readonly onEdit: (item: CreditNote) => void;
}

/**
 * การ์ดแสดงข้อมูลใบลดหนี้สำหรับ mobile/grid view
 * แสดงเลขที่เอกสาร, วันที่, vendor, ประเภท, สกุลเงิน, สถานะ และยอดรวม พร้อมรองรับ keyboard (Enter/Space) และ click เพื่อเรียก onEdit
 *
 * @param props - CnCardProps
 * @param props.item - object ข้อมูลใบลดหนี้
 * @param props.index - ลำดับของการ์ด (optional) ใช้แสดงเลขลำดับที่มุมบนซ้าย
 * @param props.onEdit - callback เมื่อคลิก/กด Enter การ์ด — มักใช้ navigate ไปหน้า edit
 * @returns React element ของการ์ดใบลดหนี้
 *
 * @example
 * <CnCard item={cn} index={0} onEdit={(c) => router.push(`/procurement/credit-note/${c.id}`)} />
 */
export default function CnCard({ item, index, onEdit }: CnCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const status = item.doc_status;
  const statusConfig = CN_STATUS_CONFIG[status];

  const typeConfig = CN_TYPE_CONFIG[item.credit_note_type];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="cursor-pointer gap-0 py-0 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.cn_no}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
              {formatDate(item.cn_date, dateFormat)}
            </div>
          </div>
        </div>
        <CardAction>
          <Badge
            className={`${statusConfig?.className ?? ""} text-xs`}
            size="sm"
          >
            {statusConfig?.label ?? status}
          </Badge>
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        <div className="flex items-start gap-2">
          <Store
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("vendor")}
            </p>
            <p className="truncate font-semibold">{item.vendor_name}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Tag
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("type")}
            </p>
            <Badge className={`${typeConfig?.className ?? ""} text-xs`} size="sm">
              {typeConfig?.label ?? item.credit_note_type}
            </Badge>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <FileText
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("currency")}
            </p>
            <p className="truncate font-semibold">{item.currency_code}</p>
          </div>
        </div>
      </CardContent>

      {item.total_amount != null && !Number.isNaN(Number(item.total_amount)) && (
        <>
          <Separator />
          <CardFooter className="justify-between px-4 py-2">
            <span className="text-muted-foreground text-xs">
              {tfl("totalAmount")}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(Number(item.total_amount))}
              <span className="text-muted-foreground ml-1 text-xs font-normal">
                {item.currency_code}
              </span>
            </span>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
