import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
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
