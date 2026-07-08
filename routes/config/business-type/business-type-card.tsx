import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import type { BusinessType } from "@/types/business-type";

interface BusinessTypeCardProps {
  readonly item: BusinessType;
  readonly index?: number;
  readonly onEdit: (item: BusinessType) => void;
}

/**
 * การ์ดแสดงข้อมูล Business Type สำหรับมุมมอง mobile รองรับการคลิกและคีย์บอร์ด
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Business Type
 * @example
 * // route: /config/business-type (mobile card view)
 * <BusinessTypeCard item={item} index={0} onEdit={handleEdit} />
 */
export default function BusinessTypeCard({
  item,
  index,
  onEdit,
}: BusinessTypeCardProps) {
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
          <CardTitle className="min-w-0 flex-1 truncate text-sm">
            {item.name || "..."}
          </CardTitle>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>
    </Card>
  );
}
