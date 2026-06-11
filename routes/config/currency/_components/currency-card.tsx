import { Coins } from "lucide-react";
import { useTranslations } from "use-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Currency } from "@/types/currency";

interface CurrencyCardProps {
  readonly item: Currency;
  readonly index?: number;
  readonly onEdit: (item: Currency) => void;
}

/**
 * การ์ดแสดงข้อมูล Currency สำหรับมุมมอง mobile
 * @param props - ข้อมูล item, index และ callback onEdit
 * @returns React element ของการ์ด Currency
 * @example
 * // route: /config/currency (mobile card view)
 * <CurrencyCard item={item} index={0} onEdit={handleEdit} />
 */
export default function CurrencyCard({
  item,
  index,
  onEdit,
}: CurrencyCardProps) {
  const ts = useTranslations("status");
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
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">{item.name}</CardTitle>
            <p className="text-muted-foreground text-xs">{item.code}</p>
          </div>
        </div>
        <CardAction>
          <Badge
            variant={item.is_active ? "success" : "destructive"}
            size="sm"
            className="text-xs"
          >
            {item.is_active ? ts("active") : ts("inactive")}
          </Badge>
        </CardAction>
      </CardHeader>

      <Separator />

      <CardContent className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Coins
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-xs">{tfl("symbol")}</span>
        </div>
        <span className="text-sm font-semibold">{item.symbol}</span>
      </CardContent>
    </Card>
  );
}
