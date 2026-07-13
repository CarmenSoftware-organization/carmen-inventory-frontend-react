import { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import { PrFormValues } from "./pr-form-schema";
import { useProductInventory } from "@/hooks/use-product-inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryBar } from "@/components/ui/summary-bar";
import { PrOnHandDialog } from "./pr-on-hand-dialog";
import { PrOnOrderDialog } from "./pr-on-order-dialog";

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

  const { data, isLoading } = useProductInventory(
    buCode,
    locationId,
    productId,
  );

  if (!locationId || !productId) return null;

  if (!data && isLoading) {
    return (
      <div className="flex items-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { on_hand_qty, on_order_qty, re_order_qty, re_stock_qty } = data;

  // label · value อยู่ line เดียวกัน + มี | คั่น เหมือน grand total (SummaryBar)
  const clickableLabel = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="tracking-wide text-primary uppercase underline-offset-4 hover:cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none"
    >
      {label}
    </button>
  );

  return (
    <>
      <SummaryBar
        className="text-[0.6875rem]"
        items={[
          {
            key: "onHand",
            label: clickableLabel(t("onHand"), () => setOnHandOpen(true)),
            value: on_hand_qty.toLocaleString(),
          },
          {
            key: "onOrder",
            label: clickableLabel(t("onOrder"), () => setOnOrderOpen(true)),
            value: on_order_qty.toLocaleString(),
          },
          {
            key: "reorderPt",
            label: (
              <span className="text-muted-foreground uppercase">
                {t("reorderPt")}
              </span>
            ),
            value: re_order_qty.toLocaleString(),
          },
          {
            key: "restock",
            label: (
              <span className="text-muted-foreground uppercase">
                {t("restock")}
              </span>
            ),
            value: re_stock_qty.toLocaleString(),
          },
        ]}
      />

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
    </>
  );
}
