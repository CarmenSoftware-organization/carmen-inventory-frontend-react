import { memo } from "react";
import { useWatch } from "react-hook-form";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ComputedPricingCell,
  OrderQtyCell,
  TaxProfileCell,
  WatchedProductUnit,
} from "./po-item-table";
import {
  DiscountRateCell,
  PriceCell,
  ProductHeaderCell,
} from "./po-items-grid-cells";
import { type PoItemRowProps } from "./po-items-grid-shared";

export const ItemRow = memo(function ItemRow({
  form,
  index,
  disabled,
  readOnly,
  showApproveCheckbox,
  isSelected,
  onToggleSelected,
  isOpen,
  onToggleOpen,
}: PoItemRowProps) {
  "use no memo";
  const isFoc = useWatch({
    control: form.control,
    name: `items.${index}.is_foc`,
  });
  const showStatusBadge = !disabled && !readOnly ? false : showApproveCheckbox;

  return (
    <tr
      id={`po-item-row-${index}`}
      className={cn(
        "border-border/40 hover:bg-primary/3 border-t align-middle transition-colors",
        isOpen && "bg-muted/20",
      )}
    >
      {showApproveCheckbox && (
        <td className="w-10 px-2 py-2 text-center align-middle">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(v) => onToggleSelected(index, v === true)}
            aria-label={`Select item ${index + 1}`}
            disabled={disabled}
          />
        </td>
      )}
      <td className="w-8 px-2 py-2 text-right">
        <button
          type="button"
          onClick={() => onToggleOpen(index)}
          aria-label={isOpen ? "Collapse details" : "Expand details"}
          aria-expanded={isOpen}
          className="border-border/60 text-muted-foreground hover:bg-muted inline-flex size-6 items-center justify-center rounded-md border bg-transparent transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="size-3" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3" aria-hidden="true" />
          )}
        </button>
      </td>
      <td className="text-muted-foreground w-7 px-2 py-2 text-left font-semibold">
        {index + 1}
      </td>
      <td className="min-w-0 px-2 py-2">
        <ProductHeaderCell
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
          isFoc={!!isFoc}
          showStatusBadge={showStatusBadge}
        />
      </td>
      <td className="px-2 py-2">
        <WatchedProductUnit
          control={form.control}
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <OrderQtyCell control={form.control} index={index} />
      </td>
      <td className="px-2 py-2 text-right">
        <PriceCell
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <DiscountRateCell
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <TaxProfileCell
          control={form.control}
          form={form}
          index={index}
          disabled={disabled}
          readOnly={readOnly}
        />
      </td>
      <td className="text-primary px-2 py-2 text-right font-semibold tabular-nums">
        <ComputedPricingCell
          control={form.control}
          index={index}
          field="total_price"
        />
      </td>
    </tr>
  );
});
