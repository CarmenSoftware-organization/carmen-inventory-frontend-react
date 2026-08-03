import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { TaxProfile } from "@/types/tax-profile";

interface Props {
  readonly item: TaxProfile;
  readonly onEdit: (item: TaxProfile) => void;
  readonly onDelete?: (item: TaxProfile) => void;
}

/** การ์ดโปรไฟล์ภาษี สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function TaxProfileCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.tax_rate != null && (
        <ListCardRow label={tfl("taxRate")}>
          <span className="tabular-nums">{item.tax_rate}</span>
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
