import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
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
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardActiveRow active={item.is_active} />
      {item.tax_rate != null && (
        <ListCardRow label={tfl("taxRate")}>
          <span className="tabular-nums">{item.tax_rate}</span>
        </ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
