import { useTranslations } from "use-intl";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { INVENTORY_PERIOD_STATUS_CONFIG } from "@/constant/inventory-period";
import type { InventoryPeriod } from "@/types/inventory-period";

interface Props {
  readonly item: InventoryPeriod;
  readonly onEdit: (item: InventoryPeriod) => void;
  readonly onDelete?: (item: InventoryPeriod) => void;
}

/**
 * การ์ดรอบสินค้าคงคลัง 1 รอบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * สถานะ (open/closed/locked) เป็น lifecycle ของเอกสาร ใช้ dot-chip จาก
 * `INVENTORY_PERIOD_STATUS_CONFIG` (badge-status.css) ตัวเดียวกับที่ตารางและหน้า
 * period-end ใช้ — ของเดิม map เป็น success/secondary/destructive ซึ่งยืม token
 * ความหมาย "สำเร็จ/ผิดพลาด" มาใช้กับ lifecycle ผิดชั้นสีตาม DESIGN.md
 */
export default function InventoryPeriodCard({ item, onEdit, onDelete }: Props) {
  const t = useTranslations("systemAdmin.inventoryPeriod");
  const { dateFormat } = useProfile();

  const statusConfig = INVENTORY_PERIOD_STATUS_CONFIG[item.status];

  return (
    <ListCard
      title={item.period}
      badge={
        <StatusIconLabel
          status={item.status}
          label={statusConfig?.label ?? item.status}
        />
      }
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardRow label={t("fiscalYear")}>
        <span className="tabular-nums">{item.fiscal_year}</span>
      </ListCardRow>
      <ListCardRow label={t("fiscalMonth")}>
        <span className="tabular-nums">{item.fiscal_month}</span>
      </ListCardRow>
      <ListCardRow label={t("startAt")}>
        <span className="tabular-nums">
          {formatDate(item.start_at, dateFormat)}
        </span>
      </ListCardRow>
      <ListCardRow label={t("endAt")}>
        <span className="tabular-nums">
          {formatDate(item.end_at, dateFormat)}
        </span>
      </ListCardRow>
    </ListCard>
  );
}
