import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
} from "@/components/share/list-card";
import type { Equipment } from "@/types/equipment";

interface EqCardProps {
  readonly item: Equipment;
  readonly categoryName?: string;
  readonly onEdit: (item: Equipment) => void;
  readonly onDelete: (item: Equipment) => void;
}

/**
 * การ์ดอุปกรณ์ 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดโมดูลอื่น
 *
 * @param props.item - ข้อมูลอุปกรณ์
 * @param props.categoryName - ชื่อหมวดหมู่ (resolve จาก category_id)
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function EqCard({
  item,
  categoryName,
  onEdit,
  onDelete,
}: EqCardProps) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {categoryName && (
        <ListCardRow label={tfl("category")}>{categoryName}</ListCardRow>
      )}
      {item.brand && (
        <ListCardRow label={tfl("brand")}>{item.brand}</ListCardRow>
      )}
      {item.model && (
        <ListCardRow label={tfl("model")}>{item.model}</ListCardRow>
      )}
      {item.station && (
        <ListCardRow label={tfl("station")}>{item.station}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
