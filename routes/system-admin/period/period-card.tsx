import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { PERIOD_STATUS_CONFIG } from "@/constant/period";
import type { Period } from "@/types/period";

interface Props {
  readonly item: Period;
  readonly onEdit: (item: Period) => void;
  readonly onDelete?: (item: Period) => void;
}

/**
 * การ์ดงวดบัญชี 1 งวด สำหรับหน้ารายการโหมด grid/mobile
 *
 * สถานะ (open/closed/locked) เป็น lifecycle ของเอกสาร ใช้ dot-chip จาก
 * `PERIOD_STATUS_CONFIG` (badge-status.css) ตัวเดียวกับที่ตารางและหน้า
 * period-end ใช้ — ของเดิม map เป็น success/secondary/destructive ซึ่งยืม token
 * ความหมาย "สำเร็จ/ผิดพลาด" มาใช้กับ lifecycle ผิดชั้นสีตาม DESIGN.md
 */
export default function PeriodCard({ item, onEdit, onDelete }: Props) {
  const t = useTranslations("systemAdmin.period");
  const { dateFormat } = useProfile();

  const statusConfig = PERIOD_STATUS_CONFIG[item.status];

  return (
    <ListCard
      title={item.period}
      badge={
        <Badge size="xs" className={statusConfig?.className}>
          {statusConfig?.label ?? item.status}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={onDelete ? () => onDelete(item) : undefined}
    >
      <ListCardRow label={t("fiscalYear")}>
        <span className="tabular-nums">{item.fiscal_year}</span>
      </ListCardRow>
      <ListCardRow label={t("fiscalMonth")}>
        <span className="tabular-nums">{item.fiscal_month}</span>
      </ListCardRow>
      <ListCardRow label={t("startAt")}>
        <span className="tabular-nums">
          {formatDate(item.start_at, dateFormat)}
        </span>
      </ListCardRow>
      <ListCardRow label={t("endAt")}>
        <span className="tabular-nums">
          {formatDate(item.end_at, dateFormat)}
        </span>
      </ListCardRow>
    </ListCard>
  );
}
