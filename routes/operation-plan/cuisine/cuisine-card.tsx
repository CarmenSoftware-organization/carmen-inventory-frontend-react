import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { CUISINE_REGION_LABEL_KEY } from "@/constant/cuisine";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const { dateTimeFormat } = useProfile();

  const regionKey = CUISINE_REGION_LABEL_KEY[item.region];

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.region && (
        <ListCardRow label={tfl("region")}>
          {regionKey ? t(regionKey) : item.region}
        </ListCardRow>
      )}
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
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
