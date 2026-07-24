import { Layers, Tag, MapPin, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { Equipment } from "@/types/equipment";

interface EqCardProps {
  readonly item: Equipment;
  readonly index?: number;
  readonly categoryName?: string;
  readonly onEdit: (item: Equipment) => void;
}

/**
 * การ์ดแสดงข้อมูลอุปกรณ์สำหรับ grid view
 * @param props - ข้อมูลอุปกรณ์, index, categoryName และ callback แก้ไข
 * @returns React element การ์ดอุปกรณ์
 * @example
 * <EqCard item={equipment} index={0} categoryName="Kitchen" onEdit={setSelected} />
 */
export default function EqCard({
  item,
  index,
  categoryName,
  onEdit,
}: EqCardProps) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();
  const brandModel = [item.brand, item.model].filter(Boolean).join(" / ");
  const updatedAt = item.audit?.updated?.at;

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
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm break-words leading-tight">
              {item.name || "..."}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">{item.code}</p>
          </div>
        </div>
        <CardAction>
          <StatusBadge active={item.is_active} />
        </CardAction>
      </CardHeader>

      {(categoryName || brandModel || item.station || updatedAt) && (
        <>
          <Separator />
          <CardContent className="space-y-1.5 px-4 py-3 text-xs">
            {categoryName && (
              <div className="flex items-center gap-1.5">
                <Layers
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="font-semibold truncate">{categoryName}</span>
              </div>
            )}
            {brandModel && (
              <div className="flex items-center gap-1.5">
                <Tag
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {brandModel}
                </span>
              </div>
            )}
            {item.station && (
              <div className="flex items-center gap-1.5">
                <MapPin
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {item.station}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-1.5">
                <Clock
                  className="text-muted-foreground size-3 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {tfl("updated")}: {formatDate(updatedAt, dateTimeFormat)}
                </span>
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
