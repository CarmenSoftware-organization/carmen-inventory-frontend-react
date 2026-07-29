import { Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { DeliveryPoint } from "@/types/delivery-point";

interface DeliveryPointCardProps {
  readonly item: DeliveryPoint;
  readonly index?: number;
  readonly onEdit: (item: DeliveryPoint) => void;
}

/**
 * การ์ดแสดงข้อมูล Delivery Point สำหรับมุมมอง mobile
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Delivery Point
 * @example
 * // route: /config/delivery-point (mobile card view)
 * <DeliveryPointCard item={item} index={0} onEdit={handleEdit} />
 */
export default function DeliveryPointCard({
  item,
  index,
  onEdit,
}: DeliveryPointCardProps) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

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
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-micro-legal font-semibold tabular-nums">
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

      {item.audit?.updated?.at && (
        <>
          <Separator />
          <CardContent className="flex items-center gap-1.5 px-4 py-2 text-xs">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {tfl("updated")}: {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </CardContent>
        </>
      )}
    </Card>
  );
}
