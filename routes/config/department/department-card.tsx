import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Department } from "@/types/department";

interface Props {
  readonly item: Department;
  readonly onEdit: (item: Department) => void;
  readonly onDelete?: (item: Department) => void;
}

/** การ์ดแผนก สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function DepartmentCard({ item, onEdit, onDelete }: Props) {
  const t = useTranslations("config.department");
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  const memberCount = item.department_users?.length ?? 0;

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {item.account_code && (
        <ListCardRow label={tfl("accountCode")}>
          {item.account_code}
        </ListCardRow>
      )}
      {memberCount > 0 && (
        <ListCardRow label={t("members")}>
          <span className="tabular-nums">{memberCount}</span>
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
