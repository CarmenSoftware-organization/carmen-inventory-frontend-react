import { CircleCheck, CircleX, Tag, Truck } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { INVENTORY_TYPE } from "@/constant/location";
import type { Location } from "@/types/location";

const LOCATION_TYPE_VARIANT: Record<INVENTORY_TYPE, BadgeProps["variant"]> = {
  [INVENTORY_TYPE.INVENTORY]: "info",
  [INVENTORY_TYPE.DIRECT]: "success",
  [INVENTORY_TYPE.CONSIGNMENT]: "warning",
};

interface LocationCardProps {
  readonly item: Location;
  readonly index?: number;
  readonly onEdit: (item: Location) => void;
}

/**
 * การ์ดแสดงข้อมูล Location สำหรับมุมมอง mobile พร้อม badge ประเภทคลัง
 *
 * ใช้ภายใน `ConfigListTemplate` ผ่าน prop `renderCard` เมื่ออยู่ในมุมมอง
 * card (มือถือ) แสดง name, code, type, physical count, delivery point
 *
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Location
 * @example
 * ```tsx
 * <LocationCard item={location} index={0} onEdit={handleEdit} />
 * ```
 */
export default function LocationCard({ item, index, onEdit }: LocationCardProps) {
  const tfl = useTranslations("field");

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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 transition-all hover:shadow-md focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="truncate text-sm flex-1 min-w-0">{item.name}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{item.code}</p>
          <Badge
            variant={LOCATION_TYPE_VARIANT[item.location_type]}
            className="text-xs"
            size="xs"
          >
            {item.location_type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          {item.physical_count_type === "yes" ? (
            <CircleCheck
              className="size-3 shrink-0 text-green-600 dark:text-green-500"
              aria-hidden="true"
            />
          ) : (
            <CircleX
              className="text-muted-foreground/50 size-3 shrink-0"
              aria-hidden="true"
            />
          )}
          <p className="text-muted-foreground text-xs">
            {tfl("physicalCount")}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Truck
            className="text-muted-foreground mt-0.5 size-3 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">
              {tfl("deliveryPoint")}
            </p>
            <p className="truncate font-medium">
              {item.delivery_point?.name ?? "-"}
            </p>
          </div>
        </div>
        {!item.is_active && (
          <div className="flex items-start gap-2">
            <Tag
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <Badge variant="secondary" size="sm" className="text-xs">
              Inactive
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
