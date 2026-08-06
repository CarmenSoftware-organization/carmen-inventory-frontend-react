import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { CreditTerm } from "@/types/credit-term";

interface Props {
  readonly item: CreditTerm;
  readonly onEdit: (item: CreditTerm) => void;
  readonly onDelete?: (item: CreditTerm) => void;
}

/** การ์ดเครดิตเทอม สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function CreditTermCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");

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
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
