import { useController, useWatch, type Control } from "react-hook-form";
import { memo, useEffect, useMemo, useRef } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { useProductUnits } from "@/hooks/use-product-units";
import { InventoryTooltip } from "@/components/ui/inventory-tooltip";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import type { PrFormValues } from "../pr-form-schema";

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

export const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
  isDisabled,
  onExtraChange,
}: {
  control: Control<PrFormValues>;
  index: number;
  unitField: "requested_unit_id" | "approved_unit_id" | "foc_unit_id";
  isDisabled: boolean;
  onExtraChange?: (value: string) => void;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const { field } = useController({
    control,
    name: `items.${index}.${unitField}`,
  });
  const unitId = field.value ?? "";
  const selectedUnit = useMemo(
    () => units.find((u) => u.id === unitId),
    [units, unitId],
  );

  // auto-init: เมื่อ units โหลดแล้วค่ายังว่าง/ไม่ match → เลือกหน่วยแรก และ
  // propagate ผ่าน onExtraChange (foc/approved) ให้ครบเหมือนเดิม — เฉพาะตอนแก้ได้
  const onExtraChangeRef = useRef(onExtraChange);
  onExtraChangeRef.current = onExtraChange;
  useEffect(() => {
    if (isDisabled || units.length === 0) return;
    if (unitId && units.some((u) => u.id === unitId)) return;
    field.onChange(units[0].id);
    onExtraChangeRef.current?.(units[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, unitId, isDisabled]);

  if (isDisabled) {
    return (
      <span className="text-muted-foreground text-xs font-medium">
        {selectedUnit?.name || "—"}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          variant="ghost"
          size="xs"
          aria-label="Unit"
          className="text-muted-foreground pr-1.5! font-semibold"
        >
          {selectedUnit?.name ?? "—"}
          <ChevronDownIcon className="size-3 opacity-60" />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
        {units.length === 0 && (
          <DropdownMenuItem disabled>—</DropdownMenuItem>
        )}
        {units.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onSelect={() => {
              field.onChange(u.id);
              onExtraChange?.(u.id);
            }}
            className="gap-2"
          >
            <span className="font-semibold">{u.name}</span>
            {u.conversion !== 1 && (
              <span className="text-muted-foreground text-xs">
                1 = {u.conversion}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
