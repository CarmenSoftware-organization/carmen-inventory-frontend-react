import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardActiveRow,
} from "@/components/share/list-card";
import type { ChartOfAccount } from "@/types/chart-of-account";

interface Props {
  readonly item: ChartOfAccount;
  readonly onEdit: (item: ChartOfAccount) => void;
  readonly onDelete?: (item: ChartOfAccount) => void;
}

/** การ์ดรหัสบัญชี สำหรับ `ConfigListTemplate` โหมด grid/mobile */
export default function CoaCard({ item, onEdit, onDelete }: Props) {
  const t = useTranslations("config.chartOfAccount");
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.code || "..."}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardActiveRow active={item.is_active} />
      <ListCardRow label={t("accountName")}>{item.description_1}</ListCardRow>
      {item.description_2 && (
        <ListCardRow label={tfl("description")}>
          {item.description_2}
        </ListCardRow>
      )}
      <ListCardRow label={tfl("nature")}>
        {t(`nature.${item.nature}`)}
      </ListCardRow>
      <ListCardRow label={tfl("type")}>
        {t(`accountType.${item.type}`)}
      </ListCardRow>
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
