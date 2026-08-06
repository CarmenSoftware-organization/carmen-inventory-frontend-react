import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { Currency } from "@/types/currency";

interface Props {
  readonly item: Currency;
  readonly onEdit: (item: Currency) => void;
  readonly onDelete?: (item: Currency) => void;
}

/** การ์ดสกุลเงิน สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function CurrencyCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      {item.symbol && (
        <ListCardRow label={tfl("symbol")}>{item.symbol}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
