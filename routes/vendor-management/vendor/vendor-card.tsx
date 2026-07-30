import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Vendor } from "@/types/vendor";

interface VendorCardProps {
  readonly item: Vendor;
  readonly onEdit: (item: Vendor) => void;
  readonly onDelete: (item: Vendor) => void;
}

/**
 * การ์ดผู้ขาย 1 ราย สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดของ procurement/product — ไฟล์นี้เหลือแค่ว่า
 * ข้อมูลอะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตารางผู้ขาย + ผู้ติดต่อหลัก
 *
 * @param props.item - ข้อมูลผู้ขาย
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function VendorCard({
  item,
  onEdit,
  onDelete,
}: VendorCardProps) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  const primaryContact = item.tb_vendor_contact?.find((c) => c.is_primary);

  return (
    <ListCard
      title={item.name || "..."}
      badge={<StatusBadge active={item.is_active} />}
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>
      {item.business_type?.length > 0 && (
        <ListCardRow label={tfl("businessType")}>
          <span className="flex flex-wrap justify-end gap-1">
            {item.business_type.map((bt) => (
              <Badge key={bt.id} variant="outline" size="xs">
                {bt.name}
              </Badge>
            ))}
          </span>
        </ListCardRow>
      )}
      {primaryContact?.name && (
        <ListCardRow label={tfl("contactPerson")}>
          {primaryContact.name}
        </ListCardRow>
      )}
      {primaryContact?.phone && (
        <ListCardRow label={tfl("phone")}>
          <span className="tabular-nums">{primaryContact.phone}</span>
        </ListCardRow>
      )}
      {primaryContact?.email && (
        <ListCardRow label={tfl("email")}>{primaryContact.email}</ListCardRow>
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
