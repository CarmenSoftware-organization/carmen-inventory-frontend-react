import { Coins, CalendarClock, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";
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
import type { PriceListTemplate } from "@/types/price-list-template";

interface PltCardProps {
  readonly item: PriceListTemplate;
  readonly index?: number;
  readonly onEdit: (item: PriceListTemplate) => void;
}

/**
 * การ์ดแสดง price list template สำหรับ grid view
 * @param props - ข้อมูล template, index และ callback เมื่อกดแก้ไข
 * @returns React element ของการ์ด
 * @example
 * <PltCard item={template} index={0} onEdit={(t) => navigate(`/vendor-management/price-list-template/${t.id}`)} />
 */
export default function PltCard({ item, index, onEdit }: PltCardProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
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
            <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <CardTitle className="text-sm flex-1 min-w-0 break-words leading-tight">
            {item.name || "..."}
          </CardTitle>
        </div>
        {item.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {item.description}
          </p>
        )}
        <CardAction>
          <StatusDotBadge
            tone={PL_STATUS_TONE[item.status] ?? "neutral"}
            size="xs"
          >
            {ts(item.status as "draft" | "active" | "inactive")}
          </StatusDotBadge>
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs">
        {item.currency?.code && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Coins
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{tfl("currency")}:</span>
            <span className="truncate font-semibold">{item.currency.code}</span>
          </div>
        )}
        {item.validity_period != null && (
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarClock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate font-semibold">
              {t("validityDays", { count: item.validity_period })}
            </span>
          </div>
        )}
        {item.audit?.updated?.at && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Clock
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{tfl("updated")}:</span>
            <span className="truncate font-semibold">
              {formatDate(item.audit.updated.at, dateTimeFormat)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
