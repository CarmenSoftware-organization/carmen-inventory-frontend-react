
import { memo } from "react";
import { useTranslations } from "use-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { cn } from "@/lib/utils";
import type {
  FromPriceListItemLocation,
  FromPriceListSelectedItem,
} from "./from-price-list-form-schema";

interface ProductCardProps {
  readonly item: FromPriceListSelectedItem;
  readonly errors?:
    | {
        locations?:
          | Array<
              | {
                  id?: { message?: string };
                  order_qty?: { message?: string };
                }
              | undefined
            >
          | { message?: string };
      }
    | undefined;
  readonly onRemoveItem: (productId: string) => void;
  readonly onAddLocation: (productId: string) => void;
  readonly onRemoveLocation: (productId: string, locIndex: number) => void;
  readonly onLocationChange: (
    productId: string,
    locIndex: number,
    patch: Partial<FromPriceListItemLocation>,
  ) => void;
}

export const ProductCard = memo(function ProductCard({
  item,
  errors,
  onRemoveItem,
  onAddLocation,
  onRemoveLocation,
  onLocationChange,
}: ProductCardProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");

  const productId = item.product_id ?? "";
  const totalQty = item.locations.reduce(
    (sum, l) => sum + (Number(l.order_qty) || 0),
    0,
  );
  const lineTotal = totalQty * item.price;

  const locErrors = Array.isArray(errors?.locations) ? errors.locations : [];

  return (
    <div className="border-border/60 bg-card overflow-hidden rounded-lg border">
      <div className="bg-muted/30 border-b px-4 py-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {item.product_code}
              </span>
              <span className="truncate text-sm font-semibold">
                {item.product_name}
              </span>
            </div>
            {item.product_local_name && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {item.product_local_name}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {item.price.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-[0.6875rem]">
              {tfl("price")} / {item.order_unit_name || "—"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemoveItem(productId)}
            aria-label={t("removeProduct")}
          >
            <Trash2 className="text-destructive size-3.5" />
          </Button>
        </div>
      </div>

      <div className="divide-border/40 divide-y">
        <div className="text-muted-foreground bg-muted/10 grid grid-cols-[1fr_8rem_2rem] gap-2 px-4 py-1 text-[0.625rem] font-semibold tracking-wide uppercase">
          <span>{tfl("location")}</span>
          <span className="text-right">{tfl("qty")}</span>
          <span />
        </div>

        {item.locations.map((loc, idx) => {
          const err = locErrors[idx];
          const locErr =
            typeof err === "object" && err && "id" in err
              ? err.id?.message
              : undefined;
          const qtyErr =
            typeof err === "object" && err && "order_qty" in err
              ? err.order_qty?.message
              : undefined;
          // กัน user pick location เดียวซ้ำใน product เดียว — exclude location
          // อื่นใน item นี้ (ยกเว้น row ปัจจุบัน)
          const excludeIds = item.locations
            .map((l, i) => (i !== idx ? l.id : ""))
            .filter((id): id is string => !!id);
          return (
            <div
              key={idx}
              className="grid grid-cols-[1fr_8rem_2rem] items-start gap-2 px-4 py-1.5"
            >
              <div>
                <LookupProductLocation
                  productId={productId}
                  value={loc.id ?? ""}
                  onValueChange={(v) =>
                    onLocationChange(productId, idx, { id: v })
                  }
                  excludeIds={excludeIds}
                  error={locErr}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="any"
                  value={loc.order_qty}
                  onChange={(e) =>
                    onLocationChange(productId, idx, {
                      order_qty: Number(e.target.value) || 0,
                    })
                  }
                  aria-invalid={!!qtyErr || undefined}
                  className={cn(
                    "h-7 text-right text-xs tabular-nums",
                    qtyErr && "border-destructive",
                  )}
                />
                {qtyErr && (
                  <p className="text-destructive mt-0.5 text-[0.625rem]">
                    {qtyErr}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemoveLocation(productId, idx)}
                disabled={item.locations.length <= 1}
                aria-label={t("removeLocation")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-muted/20 flex items-center justify-between gap-3 border-t px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onAddLocation(productId)}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("addLocation")}
        </Button>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span>
            {t("totalQty")}:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {totalQty.toLocaleString()}
            </span>
          </span>
          <span>
            {tfl("total")}:{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {lineTotal.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});
