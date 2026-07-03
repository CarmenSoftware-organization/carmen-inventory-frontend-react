import { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import { PrFormValues } from "./pr-form-schema";
import { useProductInventory } from "@/hooks/use-product-inventory";
import { Skeleton } from "@/components/ui/skeleton";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
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
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
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

  return (
    <>
      <section className="space-y-2">
        {/* Eyebrow แบบเดียวกับกลุ่มฝั่งซ้าย (PRICING/TAX) — ดู GroupEyebrow */}
        <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wider uppercase">
          {t("inventoryInfo")}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4">
            <InventoryStat
              label={t("onHand")}
              value={on_hand_qty}
              unit={unitName}
              onLabelClick={() => setOnHandOpen(true)}
            />
            <InventoryStat
              label={t("onOrder")}
              value={on_order_qty}
              unit={unitName}
              onLabelClick={() => setOnOrderOpen(true)}
            />
            <InventoryStat
              label={t("reorderPt")}
              value={re_order_qty}
              unit={unitName}
            />
            <InventoryStat
              label={t("restock")}
              value={re_stock_qty}
              unit={unitName}
            />
          </div>
        </div>
      </section>

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

interface InventoryStatProps {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly onLabelClick?: () => void;
}

function InventoryStat({
  label,
  value,
  unit,
  onLabelClick,
}: InventoryStatProps) {
  return (
    <div>
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          className="text-primary text-[0.625rem] font-semibold tracking-wide uppercase underline-offset-4 hover:cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {label}
        </button>
      ) : (
        <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-wide uppercase">
          {label}
        </span>
      )}
      <InputSuffixPlain
        className="block text-left"
        value={value.toLocaleString()}
        suffix={unit}
        valueClassName="text-sm font-semibold"
        suffixClassName="text-[0.625rem]"
      />
    </div>
  );
}
