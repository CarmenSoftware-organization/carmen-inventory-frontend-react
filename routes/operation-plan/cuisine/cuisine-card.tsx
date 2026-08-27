import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
} from "@/components/share/list-card";
import { CUISINE_REGION_LABEL_KEY } from "@/constant/cuisine";
import type { Cuisine } from "@/types/cuisine";

interface CuisineCardProps {
  readonly item: Cuisine;
  readonly onEdit: (item: Cuisine) => void;
  readonly onDelete: (item: Cuisine) => void;
}

/**
 * การ์ด cuisine 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดโมดูลอื่น · region เป็นข้อความ (label ที่แปลแล้ว)
 * ไม่ใช่ badge สี — การ์ดจึงมีสัญญาณสีเดียวที่สถานะ ส่วน ramp สีของ region
 * ยังใช้ในคอลัมน์ของตารางตามเดิม
 *
 * @param props.item - ข้อมูล cuisine
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function CuisineCard({
  item,
  onEdit,
  onDelete,
}: CuisineCardProps) {
  const t = useTranslations();
  const tfl = useTranslations("field");

  const regionKey = CUISINE_REGION_LABEL_KEY[item.region];

  return (
    <ListCard
      title={item.name || "..."}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.region && (
        <ListCardRow label={tfl("region")}>
          {regionKey ? t(regionKey) : item.region}
        </ListCardRow>
      )}
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
