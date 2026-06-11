
import { Plus } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { PriceList } from "@/types/price-list";
import { EmptyProducts } from "./pl-empty-states";
import { PLProductTable } from "./pl-product-table";
import type { PriceListFormValues } from "./pl-form-schema";

interface PLProductsSectionProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly detailFields: FieldArrayWithId<
    PriceListFormValues,
    "pricelist_detail",
    "id"
  >[];
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onAdd: () => void;
  readonly onRemove: (idx: number) => void;
  readonly tfl: (key: string) => string;
  readonly removeLabel: string;
  readonly headerLabels: {
    readonly title: string;
    readonly noItems: string;
    readonly noItemsDesc: string;
    readonly addLabel: string;
    readonly itemSingular: string;
    readonly itemPlural: string;
  };
}

/** Products section — header (title + count + add button) + table / empty state */
export function PLProductsSection({
  form,
  detailFields,
  priceList,
  isView,
  isDisabled,
  onAdd,
  onRemove,
  tfl,
  removeLabel,
  headerLabels,
}: PLProductsSectionProps) {
  return (
    <div>
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <div>
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            {headerLabels.title}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
            {getCountLabel(detailFields.length, headerLabels)}
          </p>
        </div>
        {!isDisabled && (
          <Button
            type="button"
            size="xs"
            onClick={onAdd}
            className="rounded-full"
          >
            <Plus />
            {headerLabels.addLabel}
          </Button>
        )}
      </div>

      {detailFields.length === 0 ? (
        <EmptyProducts
          onAdd={onAdd}
          disabled={isDisabled}
          title={headerLabels.noItems}
          description={headerLabels.noItemsDesc}
          addLabel={headerLabels.addLabel}
        />
      ) : (
        <PLProductTable
          form={form}
          detailFields={detailFields}
          detailRefs={priceList?.pricelist_detail}
          isView={isView}
          isDisabled={isDisabled}
          onRemove={onRemove}
          tfl={tfl}
          removeLabel={removeLabel}
        />
      )}
    </div>
  );
}

function getCountLabel(
  count: number,
  labels: PLProductsSectionProps["headerLabels"],
): string {
  if (count === 0) return labels.noItems;
  return `${count} ${count === 1 ? labels.itemSingular : labels.itemPlural}`;
}
