import { Plus } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { EmptyProducts } from "../price-list/pl-empty-states";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { PltFormValues } from "./plt-form-schema";
import type { ProductLabels } from "./plt-form-labels";
import { PltProductTable } from "./plt-product-table";

export function PltFormProductsSection({
  form,
  detailFields,
  priceListTemplate,
  stats,
  isView,
  isDisabled,
  onAddProduct,
  onRemoveTier,
  labels,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: FieldArrayWithId<PltFormValues, "details", "id">[];
  readonly priceListTemplate?: PriceListTemplate;
  readonly stats: { productCount: number; tierCount: number };
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onAddProduct: () => void;
  readonly onRemoveTier: (detailIndex: number) => void;
  readonly labels: ProductLabels;
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div>
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            {labels.sectionTitle}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
            {detailFields.length === 0
              ? labels.noItems
              : `${stats.productCount} ${labels.product} · ${stats.tierCount} ${stats.tierCount === 1 ? labels.tierSingular : labels.tierPlural}`}
          </p>
        </div>
        {!isDisabled && (
          <Button
            type="button"
            size="xs"
            onClick={onAddProduct}
            className="rounded-full"
          >
            <Plus />
            {labels.addLabel}
          </Button>
        )}
      </div>

      {detailFields.length === 0 ? (
        <EmptyProducts
          onAdd={onAddProduct}
          disabled={isDisabled}
          title={labels.noItems}
          description={labels.noItemsDesc}
          addLabel={labels.addLabel}
        />
      ) : (
        <PltProductTable
          form={form}
          detailFields={detailFields}
          priceListTemplate={priceListTemplate}
          isView={isView}
          isDisabled={isDisabled}
          onRemove={onRemoveTier}
          labels={labels}
        />
      )}
    </div>
  );
}
