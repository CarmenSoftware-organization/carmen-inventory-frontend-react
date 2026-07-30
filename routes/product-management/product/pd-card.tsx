import { useTranslations } from "use-intl";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  readonly item: Product;
  readonly onEdit: (item: Product) => void;
  readonly onDelete: (item: Product) => void;
}

/**
 * การ์ดสินค้า 1 รายการ สำหรับหน้ารายการโหมด grid/mobile
 *
 * ใช้ `ListCard` ตัวเดียวกับการ์ดของ procurement/SR/IA — ไฟล์นี้เหลือแค่ว่า
 * ข้อมูลอะไรอยู่แถวไหน ครบเท่าคอลัมน์ของตารางสินค้า
 *
 * @param props.item - ข้อมูลสินค้า
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบ
 */
export default function ProductCard({
  item,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateTimeFormat } = useProfile();

  const isActive = item.product_status_type === "active";
  const unitName = item.inventory_unit_name ?? item.inventory_unit?.name;

  return (
    <ListCard
      title={item.name || "..."}
      badge={
        <StatusDotBadge tone={isActive ? "success" : "neutral"} size="xs">
          {isActive ? ts("active") : ts("inactive")}
        </StatusDotBadge>
      }
      onOpen={() => onEdit(item)}
      onDelete={() => onDelete(item)}
    >
      <ListCardRow label={tfl("code")}>{item.code}</ListCardRow>
      {item.local_name && (
        <ListCardRow label={tfl("localName")}>{item.local_name}</ListCardRow>
      )}
      {unitName && <ListCardRow label={tfl("unit")}>{unitName}</ListCardRow>}
      {item.product_category && (
        <ListCardRow label={tfl("category")}>
          {item.product_category.name}
        </ListCardRow>
      )}
      {item.product_sub_category && (
        <ListCardRow label={tfl("subCategory")}>
          {item.product_sub_category.name}
        </ListCardRow>
      )}
      {item.product_item_group && (
        <ListCardRow label={tfl("itemGroup")}>
          {item.product_item_group.name}
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
