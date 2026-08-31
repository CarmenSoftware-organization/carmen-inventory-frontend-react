import { useTranslations } from "use-intl";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
  ListCardStatusRow,
} from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { CreditNote } from "@/types/credit-note";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
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
  const { dateFormat } = useProfile();

  const statusConfig = CN_STATUS_CONFIG[item.doc_status];
  const typeConfig = CN_TYPE_CONFIG[item.credit_note_type];
  const amount = item.total_amount;
  const hasAmount = amount != null && !Number.isNaN(Number(amount));

  return (
    <ListCard
      title={item.cn_no}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardStatusRow
        status={item.doc_status}
        label={statusConfig?.label ?? item.doc_status}
      />
      <ListCardRow label={tfl("docDate")}>
        <span className="tabular-nums">
          {formatDate(item.cn_date, dateFormat)}
        </span>
      </ListCardRow>
      <ListCardRow label={tfl("type")}>
        <StatusIconLabel
          status={item.credit_note_type}
          label={typeConfig?.label ?? item.credit_note_type}
          className="text-muted-foreground"
        />
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
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
