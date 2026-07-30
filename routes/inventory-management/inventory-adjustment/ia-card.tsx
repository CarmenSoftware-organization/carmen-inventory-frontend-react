import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import {
  IA_STATUS_CONFIG,
  IA_TYPE_CONFIG,
} from "@/constant/inventory-adjustment";
import {
  getAdjustmentType,
  type InventoryAdjustment,
} from "@/types/inventory-adjustment";

interface IaCardProps {
  readonly item: InventoryAdjustment;
  readonly onEdit: (item: InventoryAdjustment) => void;
  readonly onDelete: (item: InventoryAdjustment) => void;
}

/**
 * แถวข้อมูล label/value ในการ์ด — label ชิดซ้าย ค่าชิดขวา ตัดบรรทัดได้
 * (ไม่ truncate เพราะข้อมูลต้องครบเท่าตาราง) · โครงเดียวกับการ์ด SR
 */
function InfoRow({
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
 * การ์ดใบปรับปรุงสต๊อก 1 ใบ สำหรับหน้ารายการ mobile/grid
 * คลิกหรือกด Enter เพื่อเข้าสู่หน้าแก้ไข
 *
 * ข้อมูลตรงกับคอลัมน์ของตาราง IA (เลขที่ · วันที่ · ประเภท · เหตุผล · คลัง ·
 * จำนวนรายการ · สถานะ · ยอดรวม · created/updated)
 *
 * @param props.item - ข้อมูล InventoryAdjustment
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบมุมล่างขวา
 */
export default function IaCard({ item, onEdit, onDelete }: IaCardProps) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat, amountFormat, defaultCurrencyCode, dateTimeFormat } =
    useProfile();

  const typeKey = getAdjustmentType(item);
  const isStockIn = typeKey === "stock-in";
  const docNo = isStockIn ? item.si_no : item.so_no;
  const docDate = isStockIn ? item.si_date : item.so_date;
  const statusConfig =
    IA_STATUS_CONFIG[item.doc_status] ?? IA_STATUS_CONFIG.draft;
  const typeConfig = IA_TYPE_CONFIG[typeKey];
  const itemCount =
    item.item_count ??
    (isStockIn ? item.stock_in_detail : item.stock_out_detail)?.length ??
    0;

  // สีของ type ปรากฏครั้งเดียวต่อการ์ด — ที่ label type ตัวเดียว
  const accentText = isStockIn ? "text-success-ink" : "text-destructive";

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onEdit(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(item);
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="hover:border-primary/40 focus-visible:ring-ring cursor-pointer gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {/* หัวการ์ดเหลือแค่เลขที่กับสถานะ — วันที่ลงไปอยู่กับข้อมูลอื่นข้างล่าง */}
      <CardHeader className="gap-0 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 truncate text-sm">{docNo}</CardTitle>
          <Badge size="xs" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      {/* flex-1 + content-start: การ์ดถูกกริดยืดสูงเท่าใบสูงสุดของแถว ให้ content
          อมที่ว่างไว้ ปุ่มลบจะได้ติดก้นการ์ดตรงกันทุกใบ (บทเรียนจากการ์ด SR) */}
      <CardContent className="grid flex-1 content-start gap-1.5 px-3.5 py-3 text-xs">
        {docDate && (
          <InfoRow label={tfl("date")}>
            <span className="tabular-nums">
              {formatDate(docDate, dateFormat)}
            </span>
          </InfoRow>
        )}
        {typeConfig?.label && (
          <InfoRow label={tfl("type")}>
            <span className={cn("font-semibold uppercase", accentText)}>
              {typeConfig.label}
            </span>
          </InfoRow>
        )}
        {item.adjustment_type_name && (
          <InfoRow label={tfl("reason")}>{item.adjustment_type_name}</InfoRow>
        )}
        {item.location_name && (
          <InfoRow label={tfl("location")}>{item.location_name}</InfoRow>
        )}
        <InfoRow label={tfl("items")}>
          <span className="tabular-nums">{itemCount}</span>
        </InfoRow>
        <InfoRow label={tfl("total")}>
          <span className="font-semibold tabular-nums">
            {formatAmount(item.base_total_cost, amountFormat)}
            {defaultCurrencyCode && (
              <span className="text-muted-foreground ml-1 font-normal">
                {defaultCurrencyCode}
              </span>
            )}
          </span>
        </InfoRow>
        {/* created / by / updated อยู่ในกองเดียวกับแถวอื่น ไม่ต้องมีเส้นคั่น */}
        {item.audit?.created?.at && (
          <InfoRow label={tfl("created")}>
            <span className="tabular-nums">
              {formatDate(item.audit.created.at, dateTimeFormat)}
            </span>
          </InfoRow>
        )}
        {item.audit?.created?.name && (
          <InfoRow label={tfl("by")}>{item.audit.created.name}</InfoRow>
        )}
        {item.audit?.updated?.at && (
          <InfoRow label={tfl("updated")}>
            <span className="tabular-nums">
              {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </InfoRow>
        )}
      </CardContent>

      <Separator />

      {/* ปุ่มลบมุมล่างขวา (idiom เดียวกับการ์ด SR / config) — คลิกแล้วไม่เด้งเข้า
          หน้าแก้ไข เพราะ handleCardClick ข้าม target ที่เป็น button */}
      <CardFooter className="justify-end px-2 py-1.5">
        <Button
          type="button"
          variant="destructive"
          size="xs"
          aria-label={tc("delete")}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
