import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { LocationTypeBadge } from "@/components/ui/location-type-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const { dateTimeFormat } = useProfile();

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
