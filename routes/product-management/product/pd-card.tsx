import { useTranslations } from "use-intl";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  ListCard,
  ListCardAuditRows,
  ListCardRow,
} from "@/components/share/list-card";
import type { Product } from "@/types/product";

interface ProductCardProps {
  readonly item: Product;
  readonly onEdit: (item: Product) => void;
  readonly onDelete: (item: Product) => void;
}

export default function ProductCard({
  item,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

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
      <ListCardAuditRows audit={item.audit} />
    </ListCard>
  );
}
