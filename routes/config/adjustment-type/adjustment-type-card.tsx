import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { ADJUSTMENT_TYPE } from "@/types/adjustment-type";
import type { AdjustmentType } from "@/types/adjustment-type";

interface Props {
  readonly item: AdjustmentType;
  readonly onEdit: (item: AdjustmentType) => void;
  readonly onDelete?: (item: AdjustmentType) => void;
}

/**
 * การ์ดประเภทการปรับปรุงสต๊อก สำหรับ `ConfigListTemplate` โหมด grid/mobile
 *
 * ชนิด (รับเข้า/จ่ายออก) เป็นข้อความ ไม่ใช่ badge สี — ของเดิมใช้ variant
 * default/warning ทำให้หัวการ์ดมี badge สองใบและมีสองสีต่อใบ
 */
export default function AdjustmentTypeCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.code && <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>}
      <ListCardRow label={tfl("type")}>
        {item.type === ADJUSTMENT_TYPE.STOCK_IN
          ? tfl("stockIn")
          : tfl("stockOut")}
      </ListCardRow>
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
