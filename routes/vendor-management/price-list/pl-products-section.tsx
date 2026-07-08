
import { Plus } from "lucide-react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { SettingSection } from "../../system-admin/business-setting/business-setting-ui";
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
    <SettingSection
      wide
      title={headerLabels.title}
      description={headerLabels.noItemsDesc}
      count={detailFields.length}
      action={
        !isDisabled ? (
          <Button type="button" size="xs" onClick={onAdd}>
            <Plus />
            {headerLabels.addLabel}
          </Button>
        ) : undefined
      }
    >
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
    </SettingSection>
  );
}
