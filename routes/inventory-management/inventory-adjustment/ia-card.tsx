import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
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
 * การ์ดใบปรับปรุงสต๊อก 1 ใบ สำหรับหน้ารายการ mobile/grid
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด PR/SR — ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่แถวไหน
 * ครบเท่าคอลัมน์ของตาราง IA
 *
 * @param props.item - ข้อมูล InventoryAdjustment
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function IaCard({ item, onEdit, onDelete }: IaCardProps) {
  const tfl = useTranslations("field");
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

  return (
    <ListCard
      title={docNo}
      badge={
        <Badge size="xs" className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {docDate && (
        <ListCardRow label={tfl("date")}>
          <span className="tabular-nums">
            {formatDate(docDate, dateFormat)}
          </span>
        </ListCardRow>
      )}
      {typeConfig?.label && (
        <ListCardRow label={tfl("type")}>
          <span className={cn("font-semibold uppercase", accentText)}>
            {typeConfig.label}
          </span>
        </ListCardRow>
      )}
      {item.adjustment_type_name && (
        <ListCardRow label={tfl("reason")}>
          {item.adjustment_type_name}
        </ListCardRow>
      )}
      {item.location_name && (
        <ListCardRow label={tfl("location")}>{item.location_name}</ListCardRow>
      )}
      <ListCardRow label={tfl("items")}>
        <span className="tabular-nums">{itemCount}</span>
      </ListCardRow>
      <ListCardRow label={tfl("total")}>
        <span className="font-semibold tabular-nums">
          {formatAmount(item.base_total_cost, amountFormat)}
          {defaultCurrencyCode && (
            <span className="text-muted-foreground ml-1 font-normal">
              {defaultCurrencyCode}
            </span>
          )}
        </span>
      </ListCardRow>
      {item.audit?.created?.at && (
        <ListCardRow label={tfl("created")}>
          <span className="tabular-nums">
            {formatDate(item.audit.created.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
      {item.audit?.created?.name && (
        <ListCardRow label={tfl("by")}>{item.audit.created.name}</ListCardRow>
      )}
      {item.audit?.updated?.at && (
        <ListCardRow label={tfl("updated")}>
          <span className="tabular-nums">
            {formatDate(item.audit.updated.at, dateTimeFormat)}
          </span>
        </ListCardRow>
      )}
    </ListCard>
  );
}
