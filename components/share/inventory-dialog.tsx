import { memo } from "react";
import { useTranslations } from "use-intl";
import { BoxIcon, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useProductInventory } from "@/hooks/use-product-inventory";

interface InventoryDialogProps {
  readonly buCode?: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly unitName?: string;
  readonly icon?: "box" | "package";
  readonly className?: string;
  readonly onOnHandClick?: () => void;
  readonly onOnOrderClick?: () => void;
}

function InventoryStat({
  label,
  value,
  unitName,
  onClick,
  alert,
  muted,
}: {
  readonly label: string;
  readonly value: number;
  readonly unitName?: string;
  readonly onClick?: () => void;
  readonly alert?: boolean;
  readonly muted?: boolean;
}) {
  let labelClass = "text-info-foreground text-sm";
  if (alert) labelClass = "text-destructive text-sm";
  else if (muted) labelClass = "text-muted-foreground text-sm";

  return (
    <div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "cursor-pointer text-sm underline underline-offset-2 focus-visible:outline-none",
            alert ? "text-destructive" : "text-primary",
          )}
        >
          {label}
        </button>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          alert && "text-destructive",
        )}
      >
        {value.toLocaleString()}
        {unitName && (
          <span className="text-muted-foreground font-normal"> {unitName}</span>
        )}
      </p>
    </div>
  );
}

export const InventoryDialog = memo(function InventoryDialog({
  buCode,
  locationId,
  productId,
  unitName,
  icon = "box",
  className,
  onOnHandClick,
  onOnOrderClick,
}: InventoryDialogProps) {
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
  let progressColor = "bg-success";
  if (needsReorder) progressColor = "bg-destructive";
  else if (on_hand_qty < re_stock_qty) progressColor = "bg-warning";

  const Icon = icon === "package" ? Package : BoxIcon;
  const hasProduct = !!productId;

  return (
    // เปิดด้วยการคลิก ไม่ใช่ hover — ในนี้มีปุ่มให้กดต่อ (คงเหลือ/กำลังสั่ง) ซึ่ง
    // hover bubble รับไม่ไหว (หลุดง่ายระหว่างเลื่อนเมาส์เข้าไป และใช้ไม่ได้บนจอสัมผัส)
    <Dialog
      onOpenChange={(open) => {
        if (open && buCode && locationId && productId) refetch();
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("inventoryInfo")}
              className={cn(
                needsReorder ? "text-destructive" : "text-muted-foreground",
                className,
              )}
            >
              <Icon className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("inventoryInfo")}</TooltipContent>
      </Tooltip>
      <DialogContent
        className={hasProduct ? "sm:max-w-lg" : "sm:max-w-sm"}
      >
        <DialogHeader>
          <DialogTitle>{t("inventoryInfo")}</DialogTitle>
        </DialogHeader>
        {!hasProduct && (
          <p className="text-muted-foreground text-micro">
            {t("selectProductForInventory")}
          </p>
        )}
        {hasProduct && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
              <InventoryStat
                label={t("onHand")}
                value={on_hand_qty}
                unitName={unitName}
                onClick={onOnHandClick}
                alert={needsReorder}
              />
              <InventoryStat
                label={t("onOrder")}
                value={on_order_qty}
                unitName={unitName}
                onClick={onOnOrderClick}
              />
              <InventoryStat
                label={t("reorderPt")}
                value={re_order_qty}
                unitName={unitName}
                muted
              />
              <InventoryStat
                label={t("restock")}
                value={re_stock_qty}
                unitName={unitName}
                muted
              />
            </div>

            <Progress
              value={pct}
              className="mt-2 h-1"
              indicatorClassName={progressColor}
            />
            <div className="mt-1 flex items-center justify-between text-sm">
              {needsReorder ? (
                <span className="text-destructive font-semibold">
                  {t("needsReorder")}
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground tabular-nums">
                {t("stockLevel", { pct: pct.toFixed(1) })}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
