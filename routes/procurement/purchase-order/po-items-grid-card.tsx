import { memo } from "react";
import { useTranslations } from "use-intl";
import { useWatch } from "react-hook-form";
import { ChevronDown, MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ComputedPricingCell,
  OrderQtyCell,
  TaxProfileCell,
} from "./po-item-table";
import { DiscountRateCell, PriceCell } from "./po-items-grid-cells";
import { LineBreakdown } from "./po-items-grid-breakdown";
import { LocationsEditor } from "./po-items-grid-locations";
import { MiniField, type PoItemRowProps } from "./po-items-grid-shared";

interface ItemCardProps extends PoItemRowProps {
  /** disabled แยกสำหรับ location editor (PO จาก price list ปล่อยให้แก้ได้) */
  readonly locationsDisabled: boolean;
  readonly onDelete: (index: number) => void;
}

/**
 * Mobile card layout — 1 card ต่อ item แทน CSS grid row
 *
 * Sections (vertical):
 * 1. Header strip: [check] · # · Product name + FOC pill | Total
 * 2. 2×2 mini fields: Qty | Unit price | Disc% | Tax
 * 3. Expand button (location count) → expanded section ภายใน card
 *
 * Expanded section: LocationsEditor + LineBreakdown + Remove button
 */
export const ItemCard = memo(function ItemCard({
  form,
  index,
  disabled,
  locationsDisabled,
  readOnly,
  showApproveCheckbox,
  isSelected,
  onToggleSelected,
  isOpen,
  onToggleOpen,
  onDelete,
}: ItemCardProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const t = useTranslations("procurement.purchaseOrder");
  const productName =
    useWatch({ control: form.control, name: `items.${index}.product_name` }) ??
    "";
  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${index}.product_local_name`,
    }) ?? "";
  const isFoc = useWatch({
    control: form.control,
    name: `items.${index}.is_foc`,
  });
  const locations = useWatch({
    control: form.control,
    name: `items.${index}.locations`,
  });
  const locCount = locations?.length ?? 0;

  return (
    <div className="border-border/60 overflow-hidden rounded-lg border text-xs">
      <div className="flex items-start gap-3 p-3">
        {showApproveCheckbox && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(v) => onToggleSelected(index, v === true)}
            aria-label={`Select item ${index + 1}`}
            disabled={disabled}
            className="mt-0.5"
          />
        )}
        <span className="text-muted-foreground mt-0.5 font-semibold">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{productName || "—"}</span>
            {isFoc && (
              <Badge variant="success-light" size="xs">
                FOC
              </Badge>
            )}
          </div>
          {productLocalName && (
            <p className="text-muted-foreground truncate">{productLocalName}</p>
          )}
        </div>
        <div className="text-primary text-right font-semibold tabular-nums">
          <ComputedPricingCell
            control={form.control}
            index={index}
            field="total_price"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <MiniField label={tfl("qty")}>
          <OrderQtyCell control={form.control} index={index} />
        </MiniField>
        <MiniField label={tfl("unitPrice")}>
          <PriceCell
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </MiniField>
        <MiniField label={tfl("discPercent")}>
          <DiscountRateCell
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </MiniField>
        <MiniField label={tfl("tax")}>
          <TaxProfileCell
            control={form.control}
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </MiniField>
      </div>
      <button
        type="button"
        onClick={() => onToggleOpen(index)}
        className="bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/60 flex w-full items-center justify-center gap-1.5 border-t px-3 py-2 font-semibold transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="size-3" aria-hidden="true" />
        ) : (
          <MapPin className="size-3" aria-hidden="true" />
        )}
        {isOpen ? tc("hide") : t("locationCount", { count: locCount })}
      </button>
      {isOpen && (
        <div className="bg-muted/10 border-border/40 border-t p-3">
          <LocationsEditor
            form={form}
            index={index}
            disabled={locationsDisabled}
            readOnly={readOnly}
          />
          <div className="mt-3">
            <LineBreakdown form={form} index={index} />
          </div>
          {!disabled && !readOnly && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-destructive"
                onClick={() => onDelete(index)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
