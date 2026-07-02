import { memo, useState, type ReactNode } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Box,
  ChevronRight,
  MapPin,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { formatCurrency } from "@/lib/currency-utils";
import { FieldInput, FieldLabel } from "@/components/ui/field";
import type { GrnProductItem } from "@/types/goods-receive-note";
import type { CnFormValues } from "./cn-form-schema";
import CnTabPricing from "./cn-tab-pricing";
import CnTabDetails from "./cn-tab-details";

interface CnItemRowProps {
  readonly index: number;
  /** ลำดับที่แสดงหน้า card (1-based) */
  readonly itemNumber: number;
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly groupIndices: number[];
  /** เปิด product lookup อัตโนมัติตอน mount (row ที่เพิ่งเพิ่ม) */
  readonly autoOpenProduct?: boolean;
  /** เปิด location lookup อัตโนมัติตอน mount */
  readonly autoOpenLocation?: boolean;
}

const EYEBROW =
  "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase";

/**
 * unit lookup ที่ sync ตาม item_id ของ row — ใช้ในเซลล์ Unit ของแถวหลัก
 */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  form,
  index,
  disabled,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const productId = useWatch({ control, name: `items.${index}.item_id` }) ?? "";
  return (
    <Controller
      control={control}
      name={`items.${index}.unit_id`}
      render={({ field, fieldState }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.unit_name`, unit?.name ?? "");
          }}
          disabled={disabled || !productId}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

/** label ของเซลล์ในแถวหลัก — icon (optional) + ข้อความ */
function CellLabel({
  icon: Icon,
  children,
  htmlFor,
  required,
}: {
  readonly icon?: LucideIcon;
  readonly children: ReactNode;
  readonly htmlFor?: string;
  readonly required?: boolean;
}) {
  return (
    <FieldLabel htmlFor={htmlFor} required={required} className="text-xs">
      {Icon && <Icon className="text-muted-foreground size-3 shrink-0" />}
      {children}
    </FieldLabel>
  );
}

/** เซลล์ค่าแบบ plain text (view mode) — label เงียบ + value เด่น (truncate ถ้ายาว) */
function ViewCell({
  icon: Icon,
  label,
  children,
  invalid,
  className,
  valueClassName,
}: {
  readonly icon?: LucideIcon;
  readonly label: string;
  readonly children: ReactNode;
  readonly invalid?: boolean;
  readonly className?: string;
  /** จัด alignment/สไตล์เฉพาะ value (เช่น text-right/text-center) */
  readonly valueClassName?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <span className="text-muted-foreground flex items-center gap-1 text-xs font-normal">
        {Icon && <Icon className="size-3 shrink-0" />}
        {label}
      </span>
      {/* block + truncate + leading-8 → ellipsis ชื่อยาว + จัดกลางแนวตั้งเท่า h-8 */}
      <span
        className={cn(
          "block min-h-8 truncate text-[0.8125rem] leading-8 font-medium",
          invalid ? "text-destructive" : "text-foreground",
          valueClassName,
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * แถว CN item — บรรทัดเดียวรวม Product · Location · Quantity · Unit + net amount,
 * คลิก chevron เพื่อ expand เผยฟอร์ม Pricing / Details แบบ inline
 * (Pricing/Details reuse CnTab* เดิม — logic/คำนวณไม่แตะ)
 */
export const CnItemRow = memo(function CnItemRow({
  index,
  itemNumber,
  form,
  disabled,
  showDelete,
  onDelete,
  groupIndices,
  autoOpenProduct,
  autoOpenLocation,
}: CnItemRowProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const grnId =
    useWatch({ control: form.control, name: "grn_id" }) || undefined;
  const locationName =
    useWatch({ control: form.control, name: `items.${index}.location_name` }) ??
    "";
  const productId =
    useWatch({ control: form.control, name: `items.${index}.item_id` }) ?? "";
  const itemName =
    useWatch({ control: form.control, name: `items.${index}.item_name` }) ?? "";
  const quantity = useWatch({
    control: form.control,
    name: `items.${index}.quantity`,
  });
  const unitName =
    useWatch({ control: form.control, name: `items.${index}.unit_name` }) ?? "";
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

  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // subscribe เฉพาะ error ของ item นี้ — รับประกัน re-render เมื่อ validation ของแถวเปลี่ยน
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const itemError = errors.items?.[index];
  const productError = itemError?.item_id?.message;
  const locationError = itemError?.location_id?.message;
  const quantityError = itemError?.quantity?.message;

  // มี error ที่ไหนก็ได้ใน item → บังคับ expand ให้ field ผิด render เข้า DOM
  const showExpanded = expanded || !!itemError;

  return (
    <div>
      {/* ── Summary row: Product · Location · Quantity · Unit ── */}
      <div
        className={cn(
          "flex items-end gap-2.5 px-4 py-3 transition-colors",
          showExpanded ? "bg-muted/20" : "hover:bg-muted/20",
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={showExpanded}
          aria-label={showExpanded ? tfl("collapse") : tfl("expand")}
          className={cn(
            "flex h-8 shrink-0 cursor-pointer items-center self-end transition-colors",
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
        <span className="text-muted-foreground flex h-8 w-4 shrink-0 items-center self-end text-xs tabular-nums">
          {itemNumber}
        </span>

        {!disabled ? (
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-2 lg:grid-cols-[2fr_1.3fr_0.8fr_1fr]">
            {/* Product — กว้าง 2 คอลัมน์ */}
            <div className="col-span-2 min-w-0 space-y-1 lg:col-span-1">
              <CellLabel icon={Box} required>
                {tfl("product")}
              </CellLabel>
              <Controller
                control={form.control}
                name={`items.${index}.item_id`}
                render={({ field, fieldState }) => (
                  <LookupGrnProduct
                    grnId={grnId}
                    value={field.value ?? ""}
                    onValueChange={(
                      value,
                      product: GrnProductItem | undefined,
                    ) => {
                      field.onChange(value);
                      form.setValue(
                        `items.${index}.item_name`,
                        product?.product_name ?? "",
                        { shouldDirty: true },
                      );
                      // เปลี่ยน product → เคลียร์ location เดิม
                      form.setValue(`items.${index}.location_id`, null, {
                        shouldDirty: true,
                      });
                      form.setValue(`items.${index}.location_name`, "", {
                        shouldDirty: true,
                      });
                    }}
                    disabled={disabled}
                    defaultOpen={autoOpenProduct}
                    className="h-8 w-full text-xs"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>

            {/* Location */}
            <div className="min-w-0 space-y-1">
              <CellLabel icon={MapPin} required>
                {tfl("location")}
              </CellLabel>
              <Controller
                control={form.control}
                name={`items.${index}.location_id`}
                render={({ field, fieldState }) => (
                  <LookupGrnProductLocation
                    grnId={grnId}
                    productId={productId || undefined}
                    value={field.value ?? ""}
                    onValueChange={(value, location) => {
                      field.onChange(value);
                      form.setValue(
                        `items.${index}.location_name`,
                        location?.location_name ?? "",
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
            </div>

            {/* Quantity */}
            <div className="min-w-0 space-y-1">
              <CellLabel htmlFor={`items-${index}-quantity`} required>
                {tfl("quantity")}
              </CellLabel>
              <FieldInput
                id={`items-${index}-quantity`}
                type="number"
                inputMode="decimal"
                min={1}
                placeholder="0"
                className={cn(
                  "h-8 w-full text-right text-xs",
                  quantityError && "pl-7",
                )}
                disabled={disabled}
                error={quantityError}
                errorIconAlign="left"
                {...form.register(`items.${index}.quantity`, {
                  valueAsNumber: true,
                })}
              />
            </div>

            {/* Unit */}
            <div className="min-w-0 space-y-1">
              <CellLabel required>{tfl("unit")}</CellLabel>
              <WatchedProductUnit
                control={form.control}
                form={form}
                index={index}
                disabled={disabled}
              />
            </div>
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-[2fr_1.3fr_0.8fr_1fr]">
            <ViewCell
              icon={Box}
              label={tfl("product")}
              invalid={!!productError}
              className="col-span-2 lg:col-span-1"
            >
              {itemName || (productError ? productError : tfl("product"))}
            </ViewCell>
            <ViewCell
              icon={MapPin}
              label={tfl("location")}
              invalid={!!locationError}
            >
              {locationName || (locationError ? locationError : "—")}
            </ViewCell>
            <ViewCell label={tfl("quantity")}>
              {quantity != null ? String(quantity) : "—"}
            </ViewCell>
            <ViewCell label={tfl("unit")}>{unitName || "—"}</ViewCell>
          </div>
        )}

        <span className="text-foreground flex h-8 w-20 shrink-0 items-center justify-end self-end text-right text-[0.8125rem] font-semibold tabular-nums">
          {formatCurrency(Number(netAmount) || 0)}
        </span>
        {showDelete && (
          <div className="flex h-8 shrink-0 items-center self-end">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={tfl("deleteLocation")}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Expanded editor: Pricing / Details ── */}
      {showExpanded && (
        <div className="bg-muted/20 space-y-4 px-4 pt-2 pb-4 pl-8">
          <section className="space-y-2">
            <p className={EYEBROW}>{tfl("pricing")}</p>
            <CnTabPricing form={form} index={index} disabled={disabled} />
          </section>

          <section className="space-y-2 border-t pt-3">
            <p className={EYEBROW}>{tfl("details")}</p>
            <CnTabDetails form={form} index={index} disabled={disabled} />
          </section>
        </div>
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
