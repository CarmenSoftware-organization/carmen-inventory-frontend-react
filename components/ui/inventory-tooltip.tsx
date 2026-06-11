
import { memo } from "react";
import { useTranslations } from "use-intl";
import { BoxIcon, Package } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProductInventory } from "@/hooks/use-product-inventory";

interface InventoryTooltipProps {
  readonly buCode?: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly unitName?: string;
  readonly icon?: "box" | "package";
}

export const InventoryTooltip = memo(function InventoryTooltip({
  buCode,
  locationId,
  productId,
  unitName,
  icon = "box",
}: InventoryTooltipProps) {
  const t = useTranslations("procurement.purchaseRequest");

  const { data, refetch } = useProductInventory(
    buCode || undefined,
    locationId || undefined,
    productId || undefined,
  );

  const {
    on_hand_qty = 0,
    on_order_qty = 0,
    re_order_qty = 0,
    re_stock_qty = 0,
  } = data ?? {};
  const pct =
    re_stock_qty > 0
      ? Math.min(Math.round((on_hand_qty / re_stock_qty) * 1000) / 10, 100)
      : 0;
  const needsReorder = !!data && on_hand_qty < re_order_qty;
  let progressColor = "bg-emerald-500";
  if (needsReorder) progressColor = "bg-red-500";
  else if (on_hand_qty < re_stock_qty) progressColor = "bg-amber-500";

  const Icon = icon === "package" ? Package : BoxIcon;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip
        onOpenChange={(open) => {
          if (open && buCode && locationId && productId) refetch();
        }}
      >
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("inventoryInfo")}
            className={
              needsReorder ? "text-destructive" : "text-muted-foreground"
            }
          >
            <Icon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border w-56 rounded-lg border px-3 py-2.5 shadow-md"
        >
          <p className="mb-2 text-[0.6875rem] font-semibold">
            {t("inventoryInfo")}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.6875rem]">
            <div>
              <span
                className={
                  needsReorder ? "text-destructive" : "text-info-foreground"
                }
              >
                {t("onHand")}
              </span>
              <p
                className={`text-xs font-semibold tabular-nums ${needsReorder ? "text-destructive" : ""}`}
              >
                {on_hand_qty.toLocaleString()}
                {unitName && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    {unitName}
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-info-foreground">{t("onOrder")}</span>
              <p className="text-xs font-semibold tabular-nums">
                {on_order_qty.toLocaleString()}
                {unitName && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    {unitName}
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("reorderPt")}</span>
              <p className="text-xs font-semibold tabular-nums">
                {re_order_qty.toLocaleString()}
                {unitName && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    {unitName}
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("restock")}</span>
              <p className="text-xs font-semibold tabular-nums">
                {re_stock_qty.toLocaleString()}
                {unitName && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    {unitName}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Progress
            value={pct}
            className="mt-2 h-1"
            indicatorClassName={progressColor}
          />
          <div className="mt-1 flex items-center justify-between text-[0.625rem]">
            {needsReorder && (
              <span className="text-destructive font-medium">
                {t("needsReorder")}
              </span>
            )}
            {!needsReorder && <span />}
            <span className="text-muted-foreground tabular-nums">
              {t("stockLevel", { pct: pct.toFixed(1) })}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
