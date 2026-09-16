import { useTranslations } from "use-intl";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { PriceListTemplate } from "@/types/price-list-template";

interface PltCardProps {
  readonly item: PriceListTemplate;
  readonly onEdit: (item: PriceListTemplate) => void;
  readonly onDelete: (item: PriceListTemplate) => void;
}

/**
 * การ์ด price list template 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดของ procurement/product/vendor/price-list —
 * ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตาราง
 *
 * @param props.item - ข้อมูล template
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function PltCard({ item, onEdit, onDelete }: PltCardProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  return (
    <ListCard
      title={item.name || "..."}
      badge={
        <StatusIconLabel
          status={item.status}
          label={ts(item.status as "draft" | "active" | "inactive")}
          className="uppercase"
        />
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      {item.currency?.code && (
        <ListCardRow label={tfl("currency")}>{item.currency.code}</ListCardRow>
      )}
      {item.validity_period != null && (
        <ListCardRow label={tfl("validityPeriod")}>
          <span className="tabular-nums">
            {t("validityDays", { count: item.validity_period })}
          </span>
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
