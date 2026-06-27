import { BoxIcon, Tag } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Product } from "@/types/product";

interface ProductCardProps {
  readonly item: Product;
  readonly index?: number;
  readonly onEdit: (item: Product) => void;
}

/**
 * Card แสดงข้อมูลสินค้าแบบย่อ
 *
 * ใช้ในมุมมอง grid/mobile ของหน้ารายการสินค้า แสดง name, code, status badge,
 * local_name, inventory unit, item group รองรับคลิกและ keyboard (Enter/Space) เพื่อเรียก onEdit
 *
 * @param props - `item` (Product), `index` (ลำดับ แสดงเป็นตัวเลขกลมซ้ายบน), `onEdit` callback
 * @returns JSX ของ product card
 * @example
 * ```tsx
 * <ProductCard item={product} index={0} onEdit={(p) => navigate(`/product-management/product/${p.id}`)} />
 * ```
 */
export default function ProductCard({ item, index, onEdit }: ProductCardProps) {
  const tfl = useTranslations("field");
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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name || "..."}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{item.code}</p>
          <Badge
            variant={isActive ? "success" : "secondary"}
            size="xs"
            className="text-xs"
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        {item.local_name && (
          <div className="flex items-start gap-2">
            <Tag
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {tfl("localName")}
              </p>
              <p className="truncate font-semibold">{item.local_name}</p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <BoxIcon
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{tfl("unit")}</p>
            <p className="truncate font-semibold">
              {item.inventory_unit?.name ?? "-"}
            </p>
          </div>
        </div>
        {item.product_item_group && (
          <div className="flex items-start gap-2">
            <Tag
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {tfl("itemGroup")}
              </p>
              <p className="truncate font-semibold">
                {item.product_item_group.name}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
