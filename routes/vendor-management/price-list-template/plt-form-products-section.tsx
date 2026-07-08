import { Plus } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { SettingSection } from "../../system-admin/business-setting/business-setting-ui";
import { EmptyProducts } from "../price-list/pl-empty-states";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { PltFormValues } from "./plt-form-schema";
import type { ProductLabels } from "./plt-form-labels";
import { PltProductTable } from "./plt-product-table";

export function PltFormProductsSection({
  form,
  detailFields,
  priceListTemplate,
  isView,
  isDisabled,
  onAddProduct,
  onRemoveTier,
  labels,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: FieldArrayWithId<PltFormValues, "details", "id">[];
  readonly priceListTemplate?: PriceListTemplate;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onAddProduct: () => void;
  readonly onRemoveTier: (detailIndex: number) => void;
  readonly labels: ProductLabels;
}) {
  return (
    <SettingSection
      wide
      title={labels.sectionTitle}
      description={labels.noItemsDesc}
      count={detailFields.length}
      action={
        !isDisabled ? (
          <Button type="button" size="xs" onClick={onAddProduct}>
            <Plus />
            {labels.addLabel}
          </Button>
        ) : undefined
      }
    >
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
    </SettingSection>
  );
}
