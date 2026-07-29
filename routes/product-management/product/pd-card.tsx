import type { LucideIcon } from "lucide-react";
import { BoxIcon, Tag, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DataGridRowActions } from "@/components/ui/data-grid/data-grid-row-actions";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
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
  const { dateTimeFormat } = useProfile();
  const isActive = item.product_status_type === "active";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onEdit(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(item);
        }
      }}
      className="hover:border-primary/30 focus-visible:ring-ring flex cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-colors focus-visible:ring-2"
    >
      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            {item.name || "..."}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground truncate text-xs">
              {item.code}
            </span>
            <StatusDotBadge
              tone={isActive ? "success" : "neutral"}
              size="xs"
              className="shrink-0"
            >
              {isActive ? ts("active") : ts("inactive")}
            </StatusDotBadge>
          </div>
        </div>
        {/* ⋯ menu — Delete อย่างเดียว (คลิกการ์ด = edit อยู่แล้ว) · หยุด
            propagation ไม่ให้คลิกทะลุไปเปิด edit (เมนู portal ออก body อยู่แล้ว) */}
        <div
          className="-mt-1 -mr-1 shrink-0"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DataGridRowActions onDelete={() => onDelete(item)} />
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="space-y-2 px-4 py-3 text-xs">
        {item.local_name && (
          <InfoRow
            icon={Tag}
            label={tfl("localName")}
            value={item.local_name}
          />
        )}
        <InfoRow
          icon={BoxIcon}
          label={tfl("unit")}
          value={item.inventory_unit_name ?? item.inventory_unit?.name ?? "-"}
        />
        {item.product_category && (
          <InfoRow
            icon={Tag}
            label={tfl("category")}
            value={item.product_category.name}
          />
        )}
        {item.product_sub_category && (
          <InfoRow
            icon={Tag}
            label={tfl("subCategory")}
            value={item.product_sub_category.name}
          />
        )}
        {item.product_item_group && (
          <InfoRow
            icon={Tag}
            label={tfl("itemGroup")}
            value={item.product_item_group.name}
          />
        )}
        {item.audit?.updated?.at && (
          <InfoRow
            icon={Clock}
            label={tfl("updated")}
            value={formatDate(item.audit.updated.at, dateTimeFormat)}
          />
        )}
      </div>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        className="text-muted-foreground mt-0.5 size-3 shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}
