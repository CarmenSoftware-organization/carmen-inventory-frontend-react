import { useTranslations } from "use-intl";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import type { RunningCode } from "@/types/running-code";

interface Props {
  readonly item: RunningCode;
  readonly onEdit: (item: RunningCode) => void;
  readonly onDelete?: (item: RunningCode) => void;
}

/**
 * การ์ดรูปแบบเลขที่เอกสาร 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 * ไม่มีสถานะ จึงไม่มี badge มุมขวาบน
 */
export default function RunningCodeCard({ item, onEdit, onDelete }: Props) {
  const tfl = useTranslations("field");

  return (
    <ListCard
      title={item.type}
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      {item.note && <ListCardRow label={tfl("note")}>{item.note}</ListCardRow>}
    </ListCard>
  );
}
