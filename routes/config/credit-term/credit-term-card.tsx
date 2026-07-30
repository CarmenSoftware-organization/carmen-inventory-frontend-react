import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { CreditTerm } from "@/types/credit-term";

interface Props {
  readonly item: CreditTerm;
  readonly onEdit: (item: CreditTerm) => void;
  readonly onDelete?: (item: CreditTerm) => void;
}

/** การ์ดเครดิตเทอม สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function CreditTermCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.value != null && (
        <ListCardRow label={tfl("creditTerm")}>
          <span className="tabular-nums">
            {item.value}{" "}
            <span className="text-muted-foreground font-normal">
              {tfl("creditTermDays")}
            </span>
          </span>
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
