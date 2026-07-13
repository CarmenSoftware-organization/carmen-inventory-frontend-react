import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import {
  DiscountOverrideInput,
  OverrideToggle,
  TaxOverrideInput,
} from "@/components/procurement/discount-tax-override";
import { formatCurrency } from "@/lib/currency-utils";
import { computeLineAmounts } from "@/lib/line-pricing";
import { useAddLocationRegistry } from "./po-locations-add-context";
import { PO_COL, PO_COL_DATA_TOTAL } from "./po-item-columns";
import type { PoFormValues } from "./po-form-schema";

interface Props {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  /** location id/qty/add/delete แก้ได้ไหม (locationsDisabled) */
  readonly disabled: boolean;
  /** item-level fields (Disc%/Tax) แก้ได้ไหม (item disabled) */
  readonly fieldsDisabled: boolean;
  readonly readOnly: boolean;
  /** main row มี action column (align delete ให้ตรง) */
  readonly showActionCol: boolean;
}

type LocationPricingField =
  | "sub_total_price"
  | "discount_amount"
  | "net_amount"
  | "tax_amount"
  | "total_price";

/** อ่านค่าที่ต้องใช้คำนวณของ location เดียว → computeLineAmounts (honor override) */
function useLocationLine(
  form: UseFormReturn<PoFormValues>,
  itemIndex: number,
  locIndex: number,
) {
  "use no memo";
  const control = form.control;
  const base = `items.${itemIndex}.locations.${locIndex}` as const;
  const price = Number(
    useWatch({ control, name: `items.${itemIndex}.price` }) ?? 0,
  );
  const [qty, discRate, discAmt, isDiscAdj, taxRate, taxAmt, isTaxAdj] =
    useWatch({
      control,
      name: [
        `${base}.order_qty`,
        `${base}.discount_rate`,
        `${base}.discount_amount`,
        `${base}.is_discount_adjustment`,
        `${base}.tax_rate`,
        `${base}.tax_amount`,
        `${base}.is_tax_adjustment`,
      ] as const,
    });
  return computeLineAmounts({
    price,
    qty: Number(qty) || 0,
    discRate: Number(discRate) || 0,
    isDiscAdj: !!isDiscAdj,
    discAmt: Number(discAmt) || 0,
    taxRate: Number(taxRate) || 0,
    isTaxAdj: !!isTaxAdj,
    taxAmt: Number(taxAmt) || 0,
  });
}

/** ยอดเงินของ location เดียว (plain text) — honor override */
function LocationAmountCell({
  form,
  itemIndex,
  locIndex,
  field,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly field: LocationPricingField;
}) {
  "use no memo";
  const line = useLocationLine(form, itemIndex, locIndex);
  const values = {
    sub_total_price: line.subtotal,
    discount_amount: line.discountAmount,
    net_amount: line.netAmount,
    tax_amount: line.taxAmount,
    total_price: line.totalPrice,
  };
  return (
    <span className="block text-right tabular-nums">
      {formatCurrency(values[field])}
    </span>
  );
}

/** Unit price ของ location = ราคาระดับ item (read-only text) */
function LocationPriceText({
  form,
  itemIndex,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
}) {
  "use no memo";
  const price =
    useWatch({ control: form.control, name: `items.${itemIndex}.price` }) ?? 0;
  return (
    <span className="block text-right tabular-nums">
      {formatCurrency(price)}
    </span>
  );
}

/** Discount cell ต่อ location — override toggle + rate/amount combo (shared) */
function LocationDiscountCell({
  form,
  itemIndex,
  locIndex,
  editable,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly editable: boolean;
}) {
  "use no memo";
  const base = `items.${itemIndex}.locations.${locIndex}` as const;
  const rate =
    useWatch({ control: form.control, name: `${base}.discount_rate` }) ?? 0;
  const isAdj =
    useWatch({
      control: form.control,
      name: `${base}.is_discount_adjustment`,
    }) ?? false;
  const line = useLocationLine(form, itemIndex, locIndex);
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
function LocationTaxCell({
  form,
  itemIndex,
  locIndex,
  editable,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly editable: boolean;
}) {
  "use no memo";
  const base = `items.${itemIndex}.locations.${locIndex}` as const;
  const taxProfileId =
    useWatch({ control: form.control, name: `${base}.tax_profile_id` }) ?? null;
  const rate =
    useWatch({ control: form.control, name: `${base}.tax_rate` }) ?? 0;
  const isAdj =
    useWatch({ control: form.control, name: `${base}.is_tax_adjustment` }) ??
    false;
  const line = useLocationLine(form, itemIndex, locIndex);
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
        onTaxChange={(value, r, name) => {
          form.setValue(`${base}.tax_profile_id`, value || null, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue(`${base}.tax_rate`, r);
          form.setValue(`${base}.tax_profile_name`, name);
        }}
        onAmountChange={(a) =>
          form.setValue(`${base}.tax_amount`, a, { shouldDirty: true })
        }
      />
    </div>
  );
}

export function LocationsEditor({
  form,
  index,
  disabled,
  fieldsDisabled,
  readOnly,
  showActionCol,
}: Props) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  const unitName =
    useWatch({
      control: form.control,
      name: `items.${index}.order_unit_name`,
    }) ?? "";

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: `items.${index}.locations`,
  });
  const watchedLocations = useWatch({
    control: form.control,
    name: `items.${index}.locations`,
  });

  const locEditable = !disabled && !readOnly; // location id/qty/add/delete
  const fieldsEditable = !fieldsDisabled && !readOnly; // Disc%/Tax
  const [deleteLocIndex, setDeleteLocIndex] = useState<number | null>(null);

  const addRegistry = useAddLocationRegistry();
  useEffect(() => {
    if (!addRegistry || !locEditable) return;
    addRegistry.set(index, () =>
      prepend({
        id: "",
        location_code: "",
        location_name: "",
        order_qty: 0,
        received_qty: 0,
        discount_rate: 0,
        discount_amount: 0,
        is_discount_adjustment: false,
        tax_profile_id: null,
        tax_profile_name: "",
        tax_rate: 0,
        tax_amount: 0,
        is_tax_adjustment: false,
      }),
    );
    return () => {
      addRegistry.delete(index);
    };
  }, [addRegistry, locEditable, index, prepend]);

  // คอลัมน์ align กับ product row — % ของ (data + action ถ้ามี)
  const denom = PO_COL_DATA_TOTAL + (showActionCol ? PO_COL.action : 0);
  const pct = (px: number) => `${(px / denom) * 100}%`;
  const colCount = 9 + (showActionCol ? 1 : 0);

  return (
    <div>
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col style={{ width: pct(PO_COL.product) }} />
          <col style={{ width: pct(PO_COL.order) }} />
          <col style={{ width: pct(PO_COL.rec) }} />
          <col style={{ width: pct(PO_COL.price) }} />
          <col style={{ width: pct(PO_COL.sub) }} />
          <col style={{ width: pct(PO_COL.discount) }} />
          <col style={{ width: pct(PO_COL.net) }} />
          <col style={{ width: pct(PO_COL.tax) }} />
          <col style={{ width: pct(PO_COL.amt) }} />
          {showActionCol && <col style={{ width: pct(PO_COL.action) }} />}
        </colgroup>
        <thead className="text-muted-foreground text-[0.7rem] font-semibold">
          <tr className="border-border/60 border-b">
            <th className="px-2 py-1 text-left">{tfl("location")}</th>
            <th className="px-1 py-1 text-right">{tfl("orderAbbr")}</th>
            <th className="px-1 py-1 text-right">{tfl("receivedAbbr")}</th>
            <th className="px-2 py-1 text-right">{tfl("unitPriceAbbr")}</th>
            <th className="px-2 py-1 text-right">{tfl("subtotalAbbr")}</th>
            <th className="px-2 py-1 text-right">{tfl("discount")}</th>
            <th className="px-2 py-1 text-right">{tfl("netAbbr")}</th>
            <th className="px-2 py-1 text-right">{tfl("tax")}</th>
            <th className="px-2 py-1 text-right">{tfl("amountAbbr")}</th>
            {showActionCol && <th className="px-1 py-1" />}
          </tr>
        </thead>
        <tbody className="divide-border/60 divide-y">
          {fields.length === 0 && (
            <tr>
              <td
                colSpan={colCount}
                className="text-muted-foreground py-3 text-center"
              >
                —
              </td>
            </tr>
          )}
          {fields.map((loc, locIndex) => {
            const locErrors =
              form.formState.errors.items?.[index]?.locations?.[locIndex];
            const locIdError = locErrors?.id?.message;
            const reqQtyError = locErrors?.order_qty?.message;
            return (
              <tr
                key={loc.id}
                className="hover:bg-muted/40 align-middle transition-colors"
              >
                {/* location name (align ใต้ product) */}
                <td className="py-1 pr-2 pl-2">
                  <Controller
                    control={form.control}
                    name={`items.${index}.locations.${locIndex}.id`}
                    render={({ field, fieldState }) => (
                      <LookupProductLocation
                        productId={productId}
                        value={field.value}
                        onValueChange={field.onChange}
                        onItemChange={(loc) => {
                          // capture meta ของ location → ส่งใน payload (backend)
                          const b =
                            `items.${index}.locations.${locIndex}` as const;
                          form.setValue(`${b}.location_code`, loc.code ?? "");
                          form.setValue(`${b}.location_name`, loc.name ?? "");
                        }}
                        disabled={!locEditable}
                        readOnly={!locEditable}
                        excludeIds={(watchedLocations ?? [])
                          .map((l, i) => (i === locIndex ? null : l?.id))
                          .filter((id): id is string => !!id)}
                        className="w-full text-xs"
                        error={fieldState.error?.message ?? locIdError}
                      />
                    )}
                  />
                </td>
                {/* order qty */}
                <td className="px-1 py-1 text-right">
                  {locEditable ? (
                    <LocationQtyInput
                      form={form}
                      itemIndex={index}
                      locIndex={locIndex}
                      error={reqQtyError}
                      unitName={unitName}
                    />
                  ) : (
                    <InputSuffixPlain
                      className="block w-full text-right"
                      value={watchedLocations?.[locIndex]?.order_qty ?? 0}
                      suffix={unitName}
                    />
                  )}
                </td>
                {/* received (read-only ใน PO) */}
                <td className="px-1 py-1 text-right">
                  <InputSuffixPlain
                    className="block w-full text-right"
                    value={watchedLocations?.[locIndex]?.received_qty ?? 0}
                    suffix={unitName}
                  />
                </td>
                {/* unit price (item-level, read-only text) */}
                <td className="px-2 py-1 text-right">
                  <LocationPriceText form={form} itemIndex={index} />
                </td>
                {/* sub */}
                <td className="px-2 py-1 text-right">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="sub_total_price"
                  />
                </td>
                {/* discount combo (rate/amount + override) */}
                <td className="px-1 py-1">
                  <LocationDiscountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    editable={fieldsEditable}
                  />
                </td>
                {/* net */}
                <td className="px-2 py-1 text-right">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="net_amount"
                  />
                </td>
                {/* tax combo (profile/amount + override) */}
                <td className="px-1 py-1">
                  <LocationTaxCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    editable={fieldsEditable}
                  />
                </td>
                {/* amt */}
                <td className="px-2 py-1 text-right font-semibold">
                  <LocationAmountCell
                    form={form}
                    itemIndex={index}
                    locIndex={locIndex}
                    field="total_price"
                  />
                </td>
                {showActionCol && (
                  <td className="px-1 py-1 text-center">
                    {locEditable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        aria-label={t("removeLocation")}
                        onClick={() => setDeleteLocIndex(locIndex)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <DeleteDialog
        open={deleteLocIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteLocIndex(null);
        }}
        title={t("removeLocation")}
        description={t("removeLocationConfirm")}
        onConfirm={() => {
          if (deleteLocIndex !== null) remove(deleteLocIndex);
          setDeleteLocIndex(null);
        }}
      />
    </div>
  );
}

function LocationQtyInput({
  form,
  itemIndex,
  locIndex,
  error,
  unitName,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly error?: string;
  readonly unitName: string;
}) {
  "use no memo";
  const name = `items.${itemIndex}.locations.${locIndex}.order_qty` as const;
  const value = useWatch({ control: form.control, name }) ?? 0;
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixInput
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        placeholder="0"
        defaultValue={value}
        {...form.register(name)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          form.setValue(name, Number.isNaN(n) ? 0 : n, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
      {unitName && (
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">{unitName}</span>
        </InputSuffixAddon>
      )}
    </InputSuffixField>
  );
}
