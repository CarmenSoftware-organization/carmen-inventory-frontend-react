import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { CreditNote } from "@/types/credit-note";
import { CN_STATUS_CONFIG, CN_TYPE_CONFIG } from "@/constant/credit-note";

interface CnCardProps {
  readonly item: CreditNote;
  readonly onEdit: (item: CreditNote) => void;
  readonly onDelete: (item: CreditNote) => void;
}

/**
 * การ์ดใบลดหนี้ 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด PR/PO/GRN/SR/IA/PRT — ไฟล์นี้เหลือแค่ว่าข้อมูล
 * อะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตาราง CN · ยอดเงินใช้ `currency_code` ของ
 * ใบนั้น (CN มีสกุลเงินต่อใบเหมือน PO/GRN)
 *
 * @param props.item - ข้อมูลใบลดหนี้
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function CnCard({ item, onEdit, onDelete }: CnCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat, dateTimeFormat } = useProfile();

  const statusConfig = CN_STATUS_CONFIG[item.doc_status];
  const typeConfig = CN_TYPE_CONFIG[item.credit_note_type];
  const amount = item.total_amount;
  const hasAmount = amount != null && !Number.isNaN(Number(amount));

  return (
    <ListCard
      title={item.cn_no}
      badge={
        <Badge size="xs" className={statusConfig?.className}>
          {statusConfig?.label ?? item.doc_status}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardRow label={tfl("docDate")}>
        <span className="tabular-nums">
          {formatDate(item.cn_date, dateFormat)}
        </span>
      </ListCardRow>
      <ListCardRow label={tfl("type")}>
        {typeConfig?.label ?? item.credit_note_type}
      </ListCardRow>
      {item.vendor_name && (
        <ListCardRow label={tfl("vendor")}>{item.vendor_name}</ListCardRow>
      )}
      {hasAmount && (
        <ListCardRow label={tfl("totalAmount")}>
          <span className="font-semibold tabular-nums">
            {formatCurrency(Number(amount))}
            {item.currency_code && (
              <span className="text-muted-foreground ml-1 font-normal">
                {item.currency_code}
              </span>
            )}
          </span>
        </ListCardRow>
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
