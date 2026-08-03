import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { LocationTypeBadge } from "@/components/ui/location-type-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { Location } from "@/types/location";

interface Props {
  readonly item: Location;
  readonly onEdit: (item: Location) => void;
  readonly onDelete?: (item: Location) => void;
}

/**
 * การ์ดคลัง/สถานที่ สำหรับ `ConfigListTemplate` โหมด grid/mobile
 *
 * badge มุมขวาบนเป็นสถานะ (เหมือนการ์ดทุกใบ) ส่วนประเภทคลังเป็นแถวข้อมูล —
 * `LocationTypeBadge` เป็น badge ที่มี label แปลแล้ว จึงใช้เป็นค่าในแถวได้เลย
 */
export default function LocationCard({ item, onEdit, onDelete }: Props) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      <ListCardRow label={tfl("type")}>
        <LocationTypeBadge type={item.location_type} size="xs" />
      </ListCardRow>
      <ListCardRow label={tfl("physicalCount")}>
        {item.physical_count_type === "yes" ? tc("yes") : tc("no")}
      </ListCardRow>
      {item.delivery_point?.name && (
        <ListCardRow label={tfl("deliveryPoint")}>
          {item.delivery_point.name}
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
