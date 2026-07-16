import { memo, useEffect, useState } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Input } from "@/components/ui/input";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import {
  DiscountOverrideInput,
  OverrideToggle,
  TaxOverrideInput,
} from "@/components/procurement/discount-tax-override";
import { useProductUnits } from "@/hooks/use-product-units";
import { formatCurrency } from "@/lib/currency-utils";
import { computeLineAmounts } from "@/lib/line-pricing";
import type { GrnFormValues } from "./grn-form-schema";

type GrnUnitField = "approved_unit_id" | "received_unit_id" | "foc_unit_id";

/**
 * อ่านค่าที่ต้องใช้คำนวณของ location เดียว → computeLineAmounts (honor override)
 * ฐานคิดของ GRN = unit_price × received_qty
 */
function useGrnLocationLine(form: UseFormReturn<GrnFormValues>, index: number) {
  "use no memo";
  const [price, qty, discRate, discAmt, isDiscAdj, taxRate, taxAmt, isTaxAdj] =
    useWatch({
      control: form.control,
      name: [
        `items.${index}.unit_price`,
        `items.${index}.received_qty`,
        `items.${index}.discount_rate`,
        `items.${index}.discount_amount`,
        `items.${index}.is_discount_adjustment`,
        `items.${index}.tax_rate`,
        `items.${index}.tax_amount`,
        `items.${index}.is_tax_adjustment`,
      ] as const,
    });
  return computeLineAmounts({
    price: Number(price) || 0,
    qty: Number(qty) || 0,
    discRate: Number(discRate) || 0,
    isDiscAdj: !!isDiscAdj,
    discAmt: Number(discAmt) || 0,
    taxRate: Number(taxRate) || 0,
    isTaxAdj: !!isTaxAdj,
    taxAmt: Number(taxAmt) || 0,
  });
}

/**
 * เขียน derived amounts (discount/tax auto + net + total) กลับเข้า form เพื่อให้
 * group summary + payload อ่านได้ — render-null, ติดตั้ง 1 ตัวต่อ location index ที่
 * ระดับ grid (mirror PoItemComputedSync) จึงคำนวณแม้ group ถูก collapse
 * discount_amount/tax_amount เขียนเฉพาะตอนไม่ override (auto); override → คงค่า user
 */
export const GrnItemComputedSync = memo(function GrnItemComputedSync({
  form,
  index,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const isDiscAdj =
    useWatch({
      control: form.control,
      name: `items.${index}.is_discount_adjustment`,
    }) ?? false;
  const isTaxAdj =
    useWatch({
      control: form.control,
      name: `items.${index}.is_tax_adjustment`,
    }) ?? false;
  const { discountAmount, netAmount, taxAmount, totalPrice } =
    useGrnLocationLine(form, index);

  useEffect(() => {
    if (!isDiscAdj) {
      const cur = form.getValues(`items.${index}.discount_amount`);
      if (cur !== discountAmount) {
        form.setValue(`items.${index}.discount_amount`, discountAmount);
      }
    }
    if (!isTaxAdj) {
      const cur = form.getValues(`items.${index}.tax_amount`);
      if (cur !== taxAmount) {
        form.setValue(`items.${index}.tax_amount`, taxAmount);
      }
    }
    const curNet = form.getValues(`items.${index}.net_amount`);
    if (curNet !== netAmount) {
      form.setValue(`items.${index}.net_amount`, netAmount);
    }
    const curTotal = form.getValues(`items.${index}.total_price`);
    if (curTotal !== totalPrice) {
      form.setValue(`items.${index}.total_price`, totalPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [index, discountAmount, taxAmount, netAmount, totalPrice, isDiscAdj, isTaxAdj]);

  return null;
});

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
    <InputSuffixPlain
      className="block w-full text-right"
      value={Number(qty) || 0}
      suffix={unitName}
    />
  );
});

/**
 * เซลล์ qty + unit บน location row — input (ซ้าย) + unit lookup (ขวา) ในกล่องเดียว
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
    <InputSuffixField className="w-full" disabled={disabled} error={!!error}>
      <InputSuffixInput
        type="number"
        inputMode="decimal"
        min={min}
        placeholder="0"
        disabled={disabled}
        {...form.register(`items.${index}.${qtyField}`, {
          valueAsNumber: true,
        })}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={form.control}
          index={index}
          unitField={unitField}
          disabled={disabled}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
}

/**
 * เตือน (ไม่ block) เมื่อรับเกินจำนวนสั่งของ PO — เทียบได้เฉพาะตอนหน่วยรับ
 * ตรงกับหน่วยสั่ง (คนละหน่วยเทียบตรง ๆ ไม่ได้ ปล่อยให้ backend ตัดสินตอน commit)
 */
const OverReceiptWarning = memo(function OverReceiptWarning({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const [poDetailId, approvedQty, approvedUnitId, receivedQty, receivedUnitId] =
    useWatch({
      control,
      name: [
        `items.${index}.purchase_order_detail_id`,
        `items.${index}.approved_qty`,
        `items.${index}.approved_unit_id`,
        `items.${index}.received_qty`,
        `items.${index}.received_unit_id`,
      ] as const,
    });

  const ordered = Number(approvedQty) || 0;
  const received = Number(receivedQty) || 0;
  const comparable =
    !!poDetailId && !!approvedUnitId && approvedUnitId === receivedUnitId;
  if (!comparable || ordered <= 0 || received <= ordered) return null;

  return (
    <p className="mt-0.5 text-right text-[0.7rem] text-amber-600 dark:text-amber-500">
      {t("overReceiptWarning", { ordered })}
    </p>
  );
});

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
    <InputSuffixPlain
      className="block w-full text-right"
      value={formatCurrency(Number(v) || 0)}
    />
  );
});

/** ช่อง unit price บน location row — view → plain text */
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
      className="h-8 w-full text-right text-xs"
      disabled={disabled}
      {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
    />
  );
}

/** ยอดเงินของ location เดียว (plain text) — honor override */
function GrnAmountCell({
  form,
  index,
  field,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  field: "subtotal" | "netAmount" | "totalPrice";
}) {
  "use no memo";
  const line = useGrnLocationLine(form, index);
  return (
    <span className="block text-right tabular-nums">
      {formatCurrency(line[field])}
    </span>
  );
}

/** Discount cell ต่อ location — override toggle + rate/amount combo (shared) */
function GrnLocationDiscountCell({
  form,
  index,
  editable,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  editable: boolean;
}) {
  "use no memo";
  const base = `items.${index}` as const;
  const rate =
    useWatch({ control: form.control, name: `${base}.discount_rate` }) ?? 0;
  const isAdj =
    useWatch({
      control: form.control,
      name: `${base}.is_discount_adjustment`,
    }) ?? false;
  const line = useGrnLocationLine(form, index);
  const amount = line.discountAmount;

  if (!editable) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {/* override toggle (label คอลัมน์อยู่ที่ header row) */}
      <div className="flex justify-end">
        <OverrideToggle
          checked={isAdj}
          onCheckedChange={(on) => {
            // เปิด override: seed amount = ค่าที่คำนวณล่าสุด (ต่อเนื่อง)
            if (on) {
              form.setValue(`${base}.discount_amount`, amount, {
                shouldDirty: true,
              });
            }
            form.setValue(`${base}.is_discount_adjustment`, on, {
              shouldDirty: true,
            });
          }}
        />
      </div>
      <DiscountOverrideInput
        rate={rate}
        amount={amount}
        isAdjustment={isAdj}
        onRateChange={(r) =>
          form.setValue(`${base}.discount_rate`, r, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        onAmountChange={(a) =>
          form.setValue(`${base}.discount_amount`, a, { shouldDirty: true })
        }
      />
    </div>
  );
}

/** Tax cell ต่อ location — override toggle + tax-profile/amount combo (shared) */
function GrnLocationTaxCell({
  form,
  index,
  editable,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  editable: boolean;
}) {
  "use no memo";
  const base = `items.${index}` as const;
  const taxProfileId =
    useWatch({ control: form.control, name: `${base}.tax_profile_id` }) ?? null;
  const rate =
    useWatch({ control: form.control, name: `${base}.tax_rate` }) ?? 0;
  const isAdj =
    useWatch({ control: form.control, name: `${base}.is_tax_adjustment` }) ??
    false;
  const line = useGrnLocationLine(form, index);
  const amount = line.taxAmount;

  if (!editable) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {/* rate% + override toggle (label คอลัมน์อยู่ที่ header row) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[0.7rem] font-semibold tabular-nums">
          {rate > 0 ? `${rate}%` : ""}
        </span>
        <OverrideToggle
          checked={isAdj}
          onCheckedChange={(on) => {
            if (on) {
              form.setValue(`${base}.tax_amount`, amount, {
                shouldDirty: true,
              });
            }
            form.setValue(`${base}.is_tax_adjustment`, on, {
              shouldDirty: true,
            });
          }}
        />
      </div>
      <TaxOverrideInput
        taxProfileId={taxProfileId}
        amount={amount}
        isAdjustment={isAdj}
        onTaxChange={(value, r) => {
          form.setValue(`${base}.tax_profile_id`, value || null, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue(`${base}.tax_rate`, r);
        }}
        onAmountChange={(a) =>
          form.setValue(`${base}.tax_amount`, a, { shouldDirty: true })
        }
      />
    </div>
  );
}

interface GrnLocationRowProps {
  readonly index: number;
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly isPo: boolean;
  readonly showDelete: boolean;
  readonly onDelete: () => void;
  readonly groupIndices: number[];
  /** view mode → qty/pricing แสดงเป็น plain text */
  readonly plainText?: boolean;
  /** เปิด location lookup อัตโนมัติตอน mount (row ที่เพิ่งเพิ่ม) */
  readonly autoOpenLocation?: boolean;
}

/**
 * แถว location ของ GRN item = `<tr>` ใน location table (aligned กับ group row ผ่าน
 * GRN_COL) — location + Order/Received/FOC/Price/Sub/Discount/Net/Tax/Amount inline
 * (pricing/override อยู่ในแถวเลย ไม่มี 2nd-level expand แล้ว)
 */
export const GrnLocationRow = memo(function GrnLocationRow({
  index,
  form,
  disabled,
  isManual,
  isPo,
  showDelete,
  onDelete,
  groupIndices,
  plainText,
  autoOpenLocation,
}: GrnLocationRowProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const locationName =
    useWatch({ control: form.control, name: `items.${index}.location_name` }) ??
    "";
  const locationCode =
    useWatch({ control: form.control, name: `items.${index}.location_code` }) ??
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // subscribe เฉพาะ error ของ item นี้ — รับประกัน re-render เมื่อ validation ของแถวเปลี่ยน
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const itemError = errors.items?.[index];
  const receivedQtyError = itemError?.received_qty?.message;

  const editable = !disabled && !plainText; // discount/tax combo แก้ได้

  return (
    <tr className="hover:bg-muted/40 align-middle transition-colors">
      {/* Location (align ใต้ product) */}
      <td className="py-1 pr-2 pl-2">
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
                  form.setValue(`items.${index}.location_name`, location.name);
                  form.setValue(`items.${index}.location_code`, location.code);
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
          <p className="text-xs font-medium">
            {locationName}
            {locationCode ? (
              <>
                {" - "}
                <span className="text-foreground text-xs font-medium">
                  {locationCode}
                </span>
              </>
            ) : null}
          </p>
        )}
      </td>

      {/* Order (PO เท่านั้น — disabled) */}
      {isPo && (
        <td className="px-1 py-1 text-right">
          <QtyUnitCell
            form={form}
            index={index}
            qtyField="approved_qty"
            unitField="approved_unit_id"
            disabled
            plainText={plainText}
          />
        </td>
      )}

      {/* Received (required, min 1) */}
      <td className="px-1 py-1 text-right">
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
        {!disabled && !plainText && (
          <OverReceiptWarning control={form.control} index={index} />
        )}
      </td>

      {/* FOC */}
      <td className="px-1 py-1 text-right">
        <QtyUnitCell
          form={form}
          index={index}
          qtyField="foc_qty"
          unitField="foc_unit_id"
          disabled={disabled}
          plainText={plainText}
        />
      </td>

      {/* Unit price */}
      <td className="px-2 py-1 text-right">
        <PriceCell
          form={form}
          index={index}
          disabled={disabled}
          plainText={plainText}
        />
      </td>

      {/* Sub */}
      <td className="px-2 py-1 text-right">
        <GrnAmountCell form={form} index={index} field="subtotal" />
      </td>

      {/* Discount combo (rate/amount + override) */}
      <td className="px-1 py-1">
        <GrnLocationDiscountCell form={form} index={index} editable={editable} />
      </td>

      {/* Net */}
      <td className="px-2 py-1 text-right">
        <GrnAmountCell form={form} index={index} field="netAmount" />
      </td>

      {/* Tax combo (profile/amount + override) */}
      <td className="px-1 py-1">
        <GrnLocationTaxCell form={form} index={index} editable={editable} />
      </td>

      {/* Amount (total) */}
      <td className="px-2 py-1 text-right font-semibold">
        <GrnAmountCell form={form} index={index} field="totalPrice" />
      </td>

      {showDelete && (
        <td className="px-1 py-1 text-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
            aria-label={tfl("deleteLocation")}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>

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
        </td>
      )}
    </tr>
  );
});
