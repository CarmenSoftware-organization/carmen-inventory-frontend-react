import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import { GRN_STATUS_CONFIG } from "@/constant/goods-receive-note";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";

interface GrnCardProps {
  readonly item: GoodsReceiveNote;
  readonly onEdit: (item: GoodsReceiveNote) => void;
  readonly onDelete: (item: GoodsReceiveNote) => void;
}

/**
 * การ์ดใบรับสินค้า 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ด PR/PO/SR/IA/PRT — ไฟล์นี้เหลือแค่ว่าข้อมูล
 * อะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตาราง GRN · ยอดเงินใช้ `currency_code` ของ
 * ใบนั้น (GRN มีสกุลเงินต่อใบเหมือน PO)
 *
 * @param props.item - ข้อมูลใบรับสินค้า
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function GrnCard({ item, onEdit, onDelete }: GrnCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat, dateTimeFormat } = useProfile();

  const status = item.doc_status || "draft";
  const statusConfig = GRN_STATUS_CONFIG[status];
  const docTypeLabel = getGrnDocTypeLabel(tfl, item.doc_type);
  const totalAmount = item.total_amount;
  const hasAmount = totalAmount != null && !Number.isNaN(totalAmount);

  return (
    <ListCard
      title={item.grn_no}
      badge={
        <Badge size="xs" className={statusConfig?.className}>
          {statusConfig?.label ?? status}
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardRow label={tfl("grnDate")}>
        <span className="tabular-nums">
          {item.grn_date ? formatDate(item.grn_date, dateFormat) : "—"}
        </span>
      </ListCardRow>
      <ListCardRow label={tfl("type")}>{docTypeLabel}</ListCardRow>
      {item.vendor_name && (
        <ListCardRow label={tfl("vendor")}>{item.vendor_name}</ListCardRow>
      )}
      {item.invoice_no && (
        <ListCardRow label={tfl("invoiceNo")}>{item.invoice_no}</ListCardRow>
      )}
      {hasAmount && (
        <ListCardRow label={tfl("totalAmount")}>
          <span className="font-semibold tabular-nums">
            {formatCurrency(totalAmount)}
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
