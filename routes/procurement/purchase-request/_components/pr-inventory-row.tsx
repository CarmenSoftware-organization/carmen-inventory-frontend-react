import { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  AlertTriangle,
  ChevronDown,
  Layers3,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { PrFormValues } from "./pr-form-schema";
import { useProductInventory } from "@/hooks/use-product-inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PrOnHandDialog } from "./pr-on-hand-dialog";
import { PrOnOrderDialog } from "./pr-on-order-dialog";

type StockStatus = "healthy" | "low" | "critical";

interface Props {
  readonly control: Control<PrFormValues>;
  readonly index: number;
  readonly buCode: string;
}

export default function PrInventoryRow({ control, index, buCode }: Props) {
  const t = useTranslations("procurement.purchaseRequest");
  const [onHandOpen, setOnHandOpen] = useState(false);
  const [onOrderOpen, setOnOrderOpen] = useState(false);
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.inventory_unit_name` }) ?? "";

  const { data, isLoading } = useProductInventory(
    buCode,
    locationId,
    productId,
  );

  if (!locationId || !productId) return null;

  if (!data && isLoading) {
    return (
      <div className="space-y-2 rounded-lg border p-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { on_hand_qty, on_order_qty, re_order_qty, re_stock_qty } = data;
  const pct =
    re_stock_qty > 0
      ? Math.min(Math.round((on_hand_qty / re_stock_qty) * 1000) / 10, 100)
      : 0;

  const needsReorder = on_hand_qty < re_order_qty;
  let status: StockStatus = "healthy";
  if (needsReorder) status = "critical";
  else if (on_hand_qty < re_stock_qty) status = "low";

  const statusTheme = STATUS_THEME[status];

  return (
    <Collapsible defaultOpen>
      <div
        className={cn(
          "group bg-card relative overflow-hidden rounded-lg border shadow-xs transition-shadow hover:shadow-sm",
          statusTheme.border,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            statusTheme.accentBar,
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-12 -right-10 size-32 rounded-full opacity-40 blur-2xl",
            statusTheme.glow,
          )}
        />

        <CollapsibleTrigger className="hover:bg-muted/40 relative flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold [&[data-state=open]>div:first-child>svg]:rotate-180">
          <div className="flex items-center gap-1.5">
            <ChevronDown className="size-3.5 shrink-0 transition-transform" />
            <span>{t("inventoryInfo")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={cn("text-[0.625rem] font-medium", statusTheme.badge)}
              size="xs"
            >
              {t(`stockStatus.${status}`)}
            </Badge>
            <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
              {pct.toFixed(1)}%
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="relative space-y-3 px-3 pb-3">
            <div className="grid grid-cols-4 gap-3">
              <InventoryCard
                icon={Package}
                label={t("onHand")}
                value={on_hand_qty}
                unit={unitName}
                tone={status === "critical" ? "destructive" : "info"}
                onLabelClick={() => setOnHandOpen(true)}
              />
              <InventoryCard
                icon={Truck}
                label={t("onOrder")}
                value={on_order_qty}
                unit={unitName}
                tone="info"
                onLabelClick={() => setOnOrderOpen(true)}
              />
              <InventoryCard
                icon={AlertTriangle}
                label={t("reorderPt")}
                value={re_order_qty}
                unit={unitName}
                tone="warning"
              />
              <InventoryCard
                icon={Layers3}
                label={t("restock")}
                value={re_stock_qty}
                unit={unitName}
                tone="muted"
              />
            </div>

            <div className="space-y-1">
              <Progress
                value={pct}
                className="bg-muted/60 h-1.5"
                indicatorClassName={cn(
                  "transition-all duration-500",
                  statusTheme.indicator,
                )}
              />
              <div className="flex items-center justify-between text-[0.625rem]">
                {needsReorder ? (
                  <span className="text-destructive inline-flex items-center gap-1 font-medium">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {t("needsReorder")}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground tabular-nums">
                  {t("stockLevel", { pct: pct.toFixed(1) })}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>

      <PrOnHandDialog
        open={onHandOpen}
        onOpenChange={setOnHandOpen}
        productId={productId}
      />
      <PrOnOrderDialog
        open={onOrderOpen}
        onOpenChange={setOnOrderOpen}
        productId={productId}
      />
    </Collapsible>
  );
}

const STATUS_THEME = {
  healthy: {
    border: "border-success/30",
    accentBar: "bg-success",
    glow: "bg-success/20",
    indicator: "bg-success",
    badge: "bg-success/10 text-success-foreground",
  },
  low: {
    border: "border-warning/40",
    accentBar: "bg-warning",
    glow: "bg-warning/25",
    indicator: "bg-warning",
    badge: "bg-warning/15 text-warning-foreground",
  },
  critical: {
    border: "border-destructive/40",
    accentBar: "bg-destructive",
    glow: "bg-destructive/25",
    indicator: "bg-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
} as const;

type CardTone = "info" | "warning" | "destructive" | "muted";

const CARD_TONE: Record<
  CardTone,
  { iconBg: string; iconText: string; valueText: string }
> = {
  info: {
    iconBg: "bg-info/10",
    iconText: "text-info",
    valueText: "text-foreground",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconText: "text-warning-foreground",
    valueText: "text-foreground",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconText: "text-destructive",
    valueText: "text-destructive",
  },
  muted: {
    iconBg: "bg-muted",
    iconText: "text-muted-foreground",
    valueText: "text-foreground",
  },
};

interface InventoryCardProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly tone: CardTone;
  readonly onLabelClick?: () => void;
}

function InventoryCard({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  onLabelClick,
}: InventoryCardProps) {
  const palette = CARD_TONE[tone];
  const clickable = !!onLabelClick;
  return (
    <div
      className={cn(
        "border-border/60 bg-background/40 group/card relative space-y-1 rounded-md border px-2.5 py-2 transition-all",
        clickable && "hover:border-primary/30 hover:shadow-xs",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md",
            palette.iconBg,
            palette.iconText,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {clickable ? (
          <button
            type="button"
            onClick={onLabelClick}
            className="text-primary text-[0.625rem] font-medium tracking-wide uppercase underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {label}
          </button>
        ) : (
          <span className="text-muted-foreground text-[0.625rem] font-medium tracking-wide uppercase">
            {label}
          </span>
        )}
      </div>
      <div
        className={cn(
          "text-base leading-5 font-semibold tabular-nums",
          palette.valueText,
        )}
      >
        {value.toLocaleString()}
      </div>
      <span className="text-muted-foreground text-[0.625rem]">{unit}</span>
    </div>
  );
}
