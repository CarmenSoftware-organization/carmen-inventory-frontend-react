import { useController, useWatch, type Control } from "react-hook-form";
import { memo, type ReactNode } from "react";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import { useProductUnits } from "@/hooks/use-product-units";
import { InventoryTooltip } from "@/components/ui/inventory-tooltip";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";

type PrUnitField = "requested_unit_id" | "approved_unit_id" | "foc_unit_id";

export const STATUS_NORMALIZE: Record<string, string> = {
  approve: "approved",
  submit: "pending",
  reject: "rejected",
};

export const LOCATION_TYPE_VARIANT: Record<
  string,
  "info" | "warning" | "secondary"
> = {
  inventory: "info",
  direct: "warning",
  consignment: "secondary",
};

export function useIsRowLocked(
  control: Control<PrFormValues>,
  index: number,
): boolean {
  "use no memo";
  const currentStageStatus =
    useWatch({ control, name: `items.${index}.current_stage_status` }) ?? "";
  const initialStageStatus =
    useWatch({ control, name: `items.${index}._initial_stage_status` }) ?? "";
  const normalized = STATUS_NORMALIZE[currentStageStatus] ?? currentStageStatus;
  if (
    normalized !== PR_ITEM_STAGE_STATUS.APPROVED &&
    normalized !== PR_ITEM_STAGE_STATUS.REJECTED
  )
    return false;
  // Lock only if the status was already approve/reject on initial load (from server)
  const initialNormalized =
    STATUS_NORMALIZE[initialStageStatus] ?? initialStageStatus;
  return (
    initialNormalized === PR_ITEM_STAGE_STATUS.APPROVED ||
    initialNormalized === PR_ITEM_STAGE_STATUS.REJECTED
  );
}

export const InventoryTooltipCell = memo(function InventoryTooltipCell({
  control,
  index,
  buCode,
}: {
  control: Control<PrFormValues>;
  index: number;
  buCode?: string;
}) {
  "use no memo";
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.requested_unit_name` }) ?? "";

  return (
    <InventoryTooltip
      buCode={buCode}
      locationId={locationId}
      productId={productId}
      unitName={unitName}
      icon="package"
      className={productId ? "text-primary" : "text-muted-foreground"}
    />
  );
});

/**
 * unit lookup แบบไร้ border (Select) ฝังใน InputSuffixAddon ของกล่อง qty
 * cascade ตาม product_id ของ row — auto-select หน่วยแรกทำโดย LookupProductUnit เอง
 * `onExtraChange` ใช้ propagate หน่วยที่เลือก (requested → foc/approved) ทั้งตอน
 * auto-select และตอนผู้ใช้เลือกเอง เพราะ onValueChange ยิงทั้งสองกรณี
 */
export const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
  isDisabled,
  onExtraChange,
}: {
  control: Control<PrFormValues>;
  index: number;
  unitField: PrUnitField;
  isDisabled: boolean;
  onExtraChange?: (value: string) => void;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const { field } = useController({
    control,
    name: `items.${index}.${unitField}`,
  });

  return (
    <LookupProductUnit
      productId={productId}
      value={field.value ?? ""}
      onValueChange={(id) => {
        field.onChange(id);
        onExtraChange?.(id);
      }}
      disabled={isDisabled || !productId}
      className="h-full w-19 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
    />
  );
});

/**
 * qty + unit เป็น plain text (view/locked mode) — resolve ชื่อหน่วยจาก product
 * units ให้ล้อ layout ของกล่อง InputSuffix (ค่า ซ้าย + หน่วย ขวา, ชิดขวา)
 */
export const QtyUnitPlain = memo(function QtyUnitPlain({
  control,
  index,
  unitField,
  value,
}: {
  control: Control<PrFormValues>;
  index: number;
  unitField: PrUnitField;
  value: ReactNode;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const unitName = units.find((u) => u.id === unitId)?.name ?? "";
  return <InputSuffixPlain className="w-full" value={value} suffix={unitName} />;
});
