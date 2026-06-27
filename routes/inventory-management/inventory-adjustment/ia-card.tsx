import { CalendarDays, MapPin, Package, Tag } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import {
  IA_STATUS_CONFIG,
  IA_STATUS_VARIANT,
  IA_TYPE_CONFIG,
  IA_TYPE_ICON,
} from "@/constant/inventory-adjustment";
import {
  getAdjustmentType,
  type InventoryAdjustment,
} from "@/types/inventory-adjustment";

interface IaCardProps {
  readonly item: InventoryAdjustment;
  readonly index?: number;
  readonly onEdit: (item: InventoryAdjustment) => void;
}

export default function IaCard({ item, index, onEdit }: IaCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat, amountFormat, defaultCurrencyCode } = useProfile();

  const typeKey = getAdjustmentType(item);
  const isStockIn = typeKey === "stock-in";
  const docNo = isStockIn ? item.si_no : item.so_no;
  const docDate = isStockIn ? item.si_date : item.so_date;
  const statusConfig =
    IA_STATUS_CONFIG[item.doc_status] ?? IA_STATUS_CONFIG.draft;
  const typeConfig = IA_TYPE_CONFIG[typeKey];
  const TypeIcon = IA_TYPE_ICON[typeKey];
  const itemCount =
    item.item_count ??
    (isStockIn ? item.stock_in_detail : item.stock_out_detail)?.length ??
    0;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    onEdit(item);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit(item);
    }
  };

  const accentText = isStockIn ? "text-success" : "text-destructive";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "group focus-visible:ring-ring relative cursor-pointer gap-0 overflow-hidden border-l-[3px] py-0 transition-colors hover:-translate-y-0.5 hover:border-primary/40 focus-visible:ring-2 focus-visible:outline-none",
        isStockIn ? "border-l-success" : "border-l-destructive",
      )}
    >
      {/* ── Header ─────────────────────────────── */}
      <CardHeader className="relative space-y-0 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {/* Type icon block — replaces the type Badge for stronger visual */}
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                isStockIn
                  ? "bg-success/10 text-success ring-success/20"
                  : "bg-destructive/10 text-destructive ring-destructive/20",
              )}
              aria-hidden="true"
            >
              <TypeIcon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <CardTitle className="text-foreground truncate text-sm font-semibold tracking-tight">
                  {docNo}
                </CardTitle>
                {typeof index === "number" && (
                  <span className="text-muted-foreground/70 text-[0.625rem] tabular-nums">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-[0.6875rem]">
                <CalendarDays
                  className="size-2.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{docDate && formatDate(docDate, dateFormat)}</span>
                {typeConfig?.label && (
                  <>
                    <span aria-hidden="true" className="opacity-50">
                      ·
                    </span>
                    <span
                      className={cn(
                        "font-semibold tracking-widest uppercase",
                        accentText,
                      )}
                    >
                      {typeConfig.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Badge
            variant={IA_STATUS_VARIANT[item.doc_status]}
            size="xs"
            className="shrink-0"
          >
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      {/* ── Content ────────────────────────────── */}
      <CardContent className="relative space-y-1.5 px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Tag
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-foreground/90 truncate font-semibold">
            {item.adjustment_type_name}
          </span>
        </div>
        {item.location_name && (
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin
              className="text-muted-foreground size-3 shrink-0"
              aria-hidden="true"
            />
            <span className="text-muted-foreground truncate">
              {item.location_name}
            </span>
          </div>
        )}
      </CardContent>

      {/* ── Footer — items count + emphasized total ── */}
      <CardFooter className="bg-muted/30 border-border/60 relative items-end justify-between gap-2 border-t px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Package
            className="text-muted-foreground size-3 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-[0.6875rem]">
            {itemCount} {tfl("items")}
          </span>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-base leading-none font-semibold tabular-nums",
              accentText,
            )}
          >
            {formatAmount(item.base_total_cost, amountFormat)}
          </p>
          {defaultCurrencyCode && (
            <p className="text-muted-foreground/70 mt-1 text-[0.625rem] font-semibold tracking-widest uppercase">
              {defaultCurrencyCode}
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
