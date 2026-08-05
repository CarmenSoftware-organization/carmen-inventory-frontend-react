import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardAuditRows } from "@/components/share/list-card";
import type { DeliveryPoint } from "@/types/delivery-point";

interface Props {
  readonly item: DeliveryPoint;
  readonly onEdit: (item: DeliveryPoint) => void;
  readonly onDelete?: (item: DeliveryPoint) => void;
}

/**
 * การ์ด config 1 รายการ สำหรับ `ConfigListTemplate` โหมด grid/mobile
 * ใช้ `ListCard` ตัวเดียวกับการ์ดทุกโมดูล
 */
export default function DeliveryPointCard({ item, onEdit, onDelete }: Props) {
  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
