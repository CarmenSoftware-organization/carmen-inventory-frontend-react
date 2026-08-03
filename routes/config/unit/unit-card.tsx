import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardAuditRows } from "@/components/share/list-card";
import type { Unit } from "@/types/unit";

interface Props {
  readonly item: Unit;
  readonly onEdit: (item: Unit) => void;
  readonly onDelete?: (item: Unit) => void;
}

/**
 * การ์ด config 1 รายการ สำหรับ `ConfigListTemplate` โหมด grid/mobile
 * ใช้ `ListCard` ตัวเดียวกับการ์ดทุกโมดูล
 */
export default function UnitCard({ item, onEdit, onDelete }: Props) {
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
