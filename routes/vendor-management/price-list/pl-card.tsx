import { useTranslations } from "use-intl";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { PriceList } from "@/types/price-list";

interface PriceListCardProps {
  readonly item: PriceList;
  readonly onEdit: (item: PriceList) => void;
  readonly onDelete: (item: PriceList) => void;
}

export default function PriceListCard({
  item,
  onEdit,
  onDelete,
}: PriceListCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateFormat } = useProfile();

  const formatPeriod = (period: string): string => {
    const parts = period.split(" - ");
    if (parts.length !== 2) return period;
    const from = formatDate(parts[0], dateFormat);
    const to = formatDate(parts[1], dateFormat);
    if (!from && !to) return "—";
    return `${from} - ${to}`;
  };

  return (
    <ListCard
      title={item.name || "..."}
      badge={
        <StatusIconLabel
          status={item.status}
          label={ts(
            item.status as "draft" | "submitted" | "active" | "inactive",
          )}
          className="uppercase"
        />
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.no && <ListCardRow label={tfl("no")}>{item.no}</ListCardRow>}
      {item.vendor?.name && (
        <ListCardRow label={tfl("vendor")}>{item.vendor.name}</ListCardRow>
      )}
      {item.effectivePeriod && (
        <ListCardRow label={tfl("effectivePeriod")}>
          <span className="tabular-nums">
            {formatPeriod(item.effectivePeriod)}
          </span>
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
