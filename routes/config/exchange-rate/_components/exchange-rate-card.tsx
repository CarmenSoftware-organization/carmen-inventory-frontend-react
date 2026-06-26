import { ArrowRightLeft, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import type { ExchangeRateItem } from "@/types/exchange-rate";

interface ExchangeRateCardProps {
  readonly item: ExchangeRateItem;
  readonly index?: number;
  readonly onEdit: (item: ExchangeRateItem) => void;
  readonly onDelete?: (item: ExchangeRateItem) => void;
  readonly baseCurrency: string;
}

/**
 * การ์ดแสดงข้อมูล Exchange Rate สำหรับมุมมอง mobile พร้อมสกุลเงินฐาน
 * @param props - ข้อมูล item, index, baseCurrency และ callback onEdit
 * @returns React element ของการ์ด Exchange Rate
 * @example
 * // route: /config/exchange-rate (mobile card view)
 * <ExchangeRateCard item={item} index={0} baseCurrency="USD" onEdit={handleEdit} />
 */
export default function ExchangeRateCard({
  item,
  index,
  onEdit,
  onDelete,
  baseCurrency,
}: ExchangeRateCardProps) {
  const { dateFormat } = useProfile();
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
      className="hover:border-primary/30 focus-visible:ring-ring cursor-pointer gap-0 py-0 outline-none transition-colors focus-visible:ring-2"
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start gap-2">
          {typeof index === "number" && (
            <span className="bg-muted text-muted-foreground mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums">
              {index + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">
              {item.currency_code}
            </CardTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <ArrowRightLeft className="size-3 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                1 {item.currency_code} = {formatCurrency(item.exchange_rate, 4)}{" "}
                {baseCurrency}
              </span>
            </div>
          </div>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex items-center justify-between gap-2 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground text-xs">
            {formatDate(item.at_date, dateFormat)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
