import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { ExchangeRateItem } from "@/types/exchange-rate";

interface Props {
  readonly item: ExchangeRateItem;
  readonly baseCurrency?: string;
  readonly onEdit: (item: ExchangeRateItem) => void;
  readonly onDelete?: (item: ExchangeRateItem) => void;
}

/**
 * การ์ดอัตราแลกเปลี่ยน 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ไม่มีสถานะ active/inactive จึงไม่มี badge มุมขวาบน — หัวการ์ดเป็นรหัสสกุลเงิน
 */
export default function ExchangeRateCard({
  item,
  baseCurrency,
  onEdit,
  onDelete,
}: Props) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  return (
    <ListCard
      title={item.currency_code}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardRow label={tfl("exchangeRate")}>
        <span className="tabular-nums">
          1 {item.currency_code} = {formatCurrency(item.exchange_rate, 4)}{" "}
          <span className="text-muted-foreground font-normal">
            {baseCurrency}
          </span>
        </span>
      </ListCardRow>
      {item.at_date && (
        <ListCardRow label={tfl("date")}>
          <span className="tabular-nums">
            {formatDate(item.at_date, dateFormat)}
          </span>
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
