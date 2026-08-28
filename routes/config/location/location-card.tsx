import { useTranslations } from "use-intl";
import { LocationTypeLabel } from "@/components/share/location-type-label";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
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
 * `LocationTypeLabel` มี label แปลแล้วในตัว จึงใช้เป็นค่าในแถวได้เลย
 */
export default function LocationCard({ item, onEdit, onDelete }: Props) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      <ListCardRow label={tfl("type")}>
        <LocationTypeLabel type={item.location_type} />
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
