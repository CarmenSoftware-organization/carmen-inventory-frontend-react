import { Users } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { RequestPriceList } from "@/types/request-price-list";

interface RfpCardProps {
  readonly item: RequestPriceList;
  readonly onEdit: (item: RequestPriceList) => void;
  readonly onDelete: (item: RequestPriceList) => void;
}

/**
 * การ์ดใบขอราคา 1 ใบ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดของ procurement/product/vendor/price-list —
 * ไฟล์นี้เหลือแค่ว่าข้อมูลอะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตาราง
 * RFP ไม่มีสถานะเอกสาร มุมขวาบนจึงเป็นจำนวน vendor ที่ถูกส่งขอราคา
 *
 * @param props.item - ข้อมูลใบขอราคา
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function RfpCard({ item, onEdit, onDelete }: RfpCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const period = (() => {
    const from = formatDate(item.start_date, dateFormat);
    const to = formatDate(item.end_date, dateFormat);
    if (!from && !to) return null;
    return `${from} - ${to}`;
  })();

  return (
    <ListCard
      title={item.name || "..."}
      badge={
        <Badge variant="secondary" size="xs" className="gap-1">
          <Users aria-hidden="true" />
          <span className="tabular-nums">{item.vendor_count}</span>
        </Badge>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      {item.pricelist_template?.name && (
        <ListCardRow label={tfl("template")}>
          {item.pricelist_template.name}
        </ListCardRow>
      )}
      {period && (
        <ListCardRow label={tfl("effectivePeriod")}>
          <span className="tabular-nums">{period}</span>
        </ListCardRow>
      )}
      <ListCardRow label={tfl("vendorCount")}>
        <span className="tabular-nums">{item.vendor_count}</span>
      </ListCardRow>
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
