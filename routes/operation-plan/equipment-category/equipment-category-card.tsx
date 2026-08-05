import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { EquipmentCategory } from "@/types/equipment-category";

interface EquipmentCategoryCardProps {
  readonly item: EquipmentCategory;
  readonly onEdit: (item: EquipmentCategory) => void;
  readonly onDelete: (item: EquipmentCategory) => void;
}

/**
 * การ์ดหมวดหมู่อุปกรณ์ 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดโมดูลอื่น
 *
 * @param props.item - ข้อมูลหมวดหมู่อุปกรณ์
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function EquipmentCategoryCard({
  item,
  onEdit,
  onDelete,
}: EquipmentCategoryCardProps) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
