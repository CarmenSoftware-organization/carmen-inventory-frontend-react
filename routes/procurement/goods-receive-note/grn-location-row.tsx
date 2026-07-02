import { memo, useState } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { useProductUnits } from "@/hooks/use-product-units";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";
import { GrnLocationExpanded } from "./grn-location-expanded";

type GrnUnitField = "approved_unit_id" | "received_unit_id" | "foc_unit_id";

/** unit lookup (borderless) — ฝังในกล่อง qty เดียวกัน, sync ตาม product_id ของ row */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
  disabled,
}: {
  control: Control<GrnFormValues>;
  index: number;
  unitField: GrnUnitField;
  disabled: boolean;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  return (
    <Controller
      control={control}
      name={`items.${index}.${unitField}`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled || !productId}
          className="h-full w-19 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
        />
      )}
    />
  );
});

/** qty + unit เป็น plain text (view mode) — resolve ชื่อหน่วยจาก product units */
const QtyUnitPlain = memo(function QtyUnitPlain({
  control,
  index,
  qtyField,
  unitField,
}: {
  control: Control<GrnFormValues>;
  index: number;
  qtyField: "approved_qty" | "received_qty" | "foc_qty";
  unitField: GrnUnitField;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const qty = useWatch({ control, name: `items.${index}.${qtyField}` });
  const unitId =
    useWatch({ control, name: `items.${index}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const unitName = units.find((u) => u.id === unitId)?.name ?? "";
  return (
    <span className="w-44 shrink-0 text-right text-xs">
      <span className="text-foreground font-medium tabular-nums">
        {Number(qty) || 0}
      </span>
      {unitName && (
        <span className="text-muted-foreground ml-1 font-normal">
          {unitName}
        </span>
      )}
    </span>
  );
});

/**
 * เซลล์ qty + unit บน line ของ location — input (ซ้าย) + unit lookup (ขวา)
 * ห่อในกล่อง border เดียว (input-group) ให้ดูเป็น field เดียว
 * view mode → plain text
 */
function QtyUnitCell({
  form,
  index,
  qtyField,
  unitField,
  disabled,
  plainText,
  error,
  min = 0,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  qtyField: "approved_qty" | "received_qty" | "foc_qty";
  unitField: GrnUnitField;
  disabled: boolean;
  plainText?: boolean;
  error?: string;
  min?: number;
}) {
  "use no memo";
  if (plainText) {
    return (
      <QtyUnitPlain
        control={form.control}
        index={index}
        qtyField={qtyField}
        unitField={unitField}
      />
    );
  }
  return (
    <div
      className={cn(
        "bg-background flex h-8 w-44 shrink-0 items-center overflow-hidden rounded-md border transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        error ? "border-destructive" : "border-input",
        disabled && "bg-muted/60 opacity-70",
      )}
    >
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        placeholder="0"
        aria-invalid={!!error}
        className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"
        disabled={disabled}
        {...form.register(`items.${index}.${qtyField}`, {
          valueAsNumber: true,
        })}
      />
      <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
      <WatchedProductUnit
        control={form.control}
        index={index}
        unitField={unitField}
        disabled={disabled}
      />
    </div>
  );
}

/** unit price เป็น plain text (view mode) */
const PricePlain = memo(function PricePlain({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const v = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <span className="text-foreground w-28 shrink-0 text-right text-xs font-medium tabular-nums">
      {formatCurrency(Number(v) || 0)}
    </span>
  );
});

/** ช่อง unit price บน location line — view → plain text */
function PriceCell({
  form,
  index,
  disabled,
  plainText,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  disabled: boolean;
  plainText?: boolean;
}) {
  "use no memo";
  if (plainText) return <PricePlain control={form.control} index={index} />;
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      placeholder="0.00"
      className="h-8 w-28 shrink-0 text-right text-xs"
      disabled={disabled}
      {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
    />
  );
}

interface GrnLocationRowProps {
  readonly index: number;
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly groupIndices: number[];
  /** view mode → qty แสดงเป็น plain text */
  readonly plainText?: boolean;
  /** เปิด location lookup อัตโนมัติตอน mount (row ที่เพิ่งเพิ่ม) */
  readonly autoOpenLocation?: boolean;
}

/**
 * แถว location ของ GRN item — location + Order/Received/FOC qty บน line เดียว,
 * คลิก chevron เพื่อ expand เผยฟอร์ม Pricing / Details (reuse GrnTab* เดิม)
 */
export const GrnLocationRow = memo(function GrnLocationRow({
  index,
  form,
  disabled,
  isManual,
  showDelete,
  onDelete,
  groupIndices,
  plainText,
  autoOpenLocation,
}: GrnLocationRowProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const docType = useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const isPo = docType !== "manual";
  const locationName =
    useWatch({ control: form.control, name: `items.${index}.location_name` }) ??
    "";
  const locationId =
    useWatch({ control: form.control, name: `items.${index}.location_id` }) ??
    "";
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  // location ของ sibling rows ใน group เดียวกัน — reactive เพื่อกันเลือกซ้ำ
  const siblingLocationIds = useWatch({
    control: form.control,
    name: groupIndices
      .filter((i) => i !== index)
      .map((i) => `items.${i}.location_id` as const),
  });
  const excludeLocationIds = (siblingLocationIds ?? []).filter(
    (v): v is string => !!v,
  );

  const netAmount = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });

  // เริ่ม expand เองถ้าเป็น manual ที่ยังไม่ได้เลือก location (ต้องกรอกก่อน)
  const [expanded, setExpanded] = useState(isManual && !locationId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // subscribe เฉพาะ error ของ item นี้ — รับประกัน re-render เมื่อ validation ของแถวเปลี่ยน
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const itemError = errors.items?.[index];
  const locationError = itemError?.location_id?.message;
  const receivedQtyError = itemError?.received_qty?.message;

  // มี field error ใน pricing/details → บังคับ expand ให้ scroll หาเจอ
  // (location/qty อยู่ line หลักแล้ว จึงเห็น error ได้โดยไม่ต้อง expand)
  const showExpanded = expanded || !!itemError;

  return (
    <div>
      {/* ── location + Order/Received/FOC บน line เดียว ── */}
      <div className="hover:bg-muted/40 flex items-center gap-2.5 py-2 pr-4 pl-3 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={showExpanded}
          aria-label={showExpanded ? tfl("collapse") : tfl("expand")}
          className={cn(
            "flex size-4 shrink-0 cursor-pointer items-center justify-center transition-colors",
            showExpanded
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              showExpanded && "rotate-90",
            )}
            aria-hidden="true"
          />
        </button>

        {/* Location */}
        <div className="min-w-0 flex-1">
          {isManual && !disabled ? (
            <Controller
              control={form.control}
              name={`items.${index}.location_id`}
              render={({ field, fieldState }) => (
                <LookupProductLocation
                  productId={productId}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onItemChange={(location) => {
                    form.setValue(
                      `items.${index}.location_name`,
                      location.name,
                    );
                    form.setValue(
                      `items.${index}.location_code`,
                      location.code,
                    );
                    form.setValue(
                      `items.${index}.location_type`,
                      location.location_type,
                    );
                  }}
                  defaultLabel={locationName || undefined}
                  excludeIds={excludeLocationIds}
                  disabled={!productId}
                  defaultOpen={autoOpenLocation}
                  className="h-8 w-full text-xs"
                  modal
                  error={fieldState.error?.message}
                />
              )}
            />
          ) : (
            <span
              className={cn(
                "truncate text-xs font-medium",
                locationError ? "text-destructive" : "text-foreground",
              )}
            >
              {locationName || (locationError ? locationError : "—")}
            </span>
          )}
        </div>

        {/* Order (PO เท่านั้น — disabled) */}
        {isPo && (
          <QtyUnitCell
            form={form}
            index={index}
            qtyField="approved_qty"
            unitField="approved_unit_id"
            disabled
            plainText={plainText}
          />
        )}

        {/* Received (required) */}
        <QtyUnitCell
          form={form}
          index={index}
          qtyField="received_qty"
          unitField="received_unit_id"
          disabled={disabled}
          plainText={plainText}
          error={receivedQtyError}
          min={1}
        />

        {/* FOC */}
        <QtyUnitCell
          form={form}
          index={index}
          qtyField="foc_qty"
          unitField="foc_unit_id"
          disabled={disabled}
          plainText={plainText}
        />

        {/* Unit price */}
        <PriceCell
          form={form}
          index={index}
          disabled={disabled}
          plainText={plainText}
        />

        <span className="text-foreground w-20 shrink-0 text-right text-xs font-semibold tabular-nums">
          {formatCurrency(Number(netAmount) || 0)}
        </span>
        {showDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive ml-1 shrink-0"
            aria-label={tfl("deleteLocation")}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {/* ── Expanded editor: Pricing / Details ── */}
      {showExpanded && (
        <GrnLocationExpanded form={form} index={index} disabled={disabled} />
      )}

      <DeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={tfl("deleteLocation")}
        description={locationName || undefined}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
});
