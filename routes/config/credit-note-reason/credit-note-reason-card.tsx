import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { CnReason } from "@/types/cn-reason";

interface Props {
  readonly item: CnReason;
  readonly onEdit: (item: CnReason) => void;
  readonly onDelete?: (item: CnReason) => void;
}

/**
 * การ์ด config 1 รายการ สำหรับ `ConfigListTemplate` โหมด grid/mobile
 * ใช้ `ListCard` ตัวเดียวกับการ์ดทุกโมดูล
 */
export default function CreditNoteReasonCard({
  item,
  onEdit,
  onDelete,
}: Props) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.description && (
        <ListCardRow label={tfl("description")}>{item.description}</ListCardRow>
      )}
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
