import { CalendarDays, Store } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type { PriceList } from "@/types/price-list";

interface PriceListCardProps {
  readonly item: PriceList;
  readonly index?: number;
  readonly onEdit: (item: PriceList) => void;
}

/**
 * การ์ดแสดงข้อมูล price list สำหรับ grid view พร้อม vendor และช่วงวันที่
 * @param props - ข้อมูล price list, index และ callback เมื่อกดแก้ไข
 * @returns React element ของการ์ด price list
 * @example
 * <PriceListCard item={priceList} index={0} onEdit={(p) => navigate(`/vendor-management/price-list/${p.id}`)} />
 */
export default function PriceListCard({ item, index, onEdit }: PriceListCardProps) {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateFormat } = useProfile();

  const formatPeriod = (period: string): string => {
    const parts = period.split(" - ");
    if (parts.length !== 2) return period;
    const from = formatDate(parts[0], dateFormat);
    const to = formatDate(parts[1], dateFormat);
    if (!from && !to) return "—";
    return `${from} - ${to}`;
  };

  const variantMap: Record<string, "outline" | "success" | "secondary"> = {
    draft: "outline",
    active: "success",
    inactive: "secondary",
  };

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
          <CardTitle className="text-sm flex-1 min-w-0 break-words">{item.name || "..."}</CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">{item.no}</p>
          <Badge
            variant={variantMap[item.status] ?? "outline"}
            size="xs"
            className="text-xs"
          >
            {ts(item.status as "draft" | "submitted" | "active" | "inactive")}
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-2 px-4 py-3 text-xs">
        {item.vendor?.name && (
          <div className="flex items-start gap-2">
            <Store
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">{tfl("vendor")}</p>
              <p className="truncate font-semibold">{item.vendor.name}</p>
            </div>
          </div>
        )}
        {item.effectivePeriod && (
          <div className="flex items-start gap-2">
            <CalendarDays
              className="text-muted-foreground mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {tfl("effectivePeriod")}
              </p>
              <p className="truncate font-semibold">{formatPeriod(item.effectivePeriod)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
