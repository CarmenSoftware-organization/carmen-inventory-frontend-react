import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import {
  DiscountOverrideInput,
  OverrideToggle,
  TaxOverrideInput,
} from "../../shared/discount-tax-override";
import { formatCurrency } from "@/lib/currency-utils";
import { computeLineAmounts } from "@/lib/line-pricing";
import type { PoFormValues } from "../po-form-schema";

type LocationPricingField =
  | "sub_total_price"
  | "discount_amount"
  | "net_amount"
  | "tax_amount"
  | "total_price";

/** อ่านค่าที่ต้องใช้คำนวณของ location เดียว → computeLineAmounts (honor override) */

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

/** ยอดเงินของ location เดียว (plain text) — honor override */
export function LocationAmountCell({
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

/** Unit price ของ location = ราคาระดับ item (read-only text) */
export function LocationPriceText({
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

/** Discount cell ต่อ location — override toggle + rate/amount combo (shared) */
export function LocationDiscountCell({
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
  const tfl = useTranslations("field");
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
    // checkbox อยู่ข้างช่องกรอก ไม่ใช่ลอยเป็นบรรทัดของตัวเองเหนือช่อง — เซลล์แคบ
    // อยู่แล้ว เสียไปทั้งบรรทัดเพื่อ checkbox ตัวเดียวไม่คุ้ม (ท่าเดียวกับ GRN/CN)
    <div className="flex items-center gap-1.5">
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
      <OverrideToggle
        checked={isAdj}
        hint={tfl("overrideHintDiscount")}
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
  );
}

/** Tax cell ต่อ location — override toggle + tax-profile/amount combo (shared) */

/** Tax cell ต่อ location — override toggle + tax-profile/amount combo (shared) */
export function LocationTaxCell({
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
  const tfl = useTranslations("field");
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
      {rate > 0 && (
        <span className="text-muted-foreground text-micro text-right font-semibold tabular-nums">
          {rate}%
        </span>
      )}
      {/* checkbox อยู่ข้างช่องกรอก ท่าเดียวกับคอลัมน์ส่วนลด */}
      <div className="flex items-center gap-1.5">
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
        <OverrideToggle
          checked={isAdj}
          hint={tfl("overrideHintTax")}
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
    </div>
  );
}

export function LocationQtyInput({
  form,
  itemIndex,
  locIndex,
  error,
  unitName,
  decimals,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly error?: string;
  readonly unitName: string;
  readonly decimals: number;
}) {
  "use no memo";
  const name = `items.${itemIndex}.locations.${locIndex}.order_qty` as const;
  const value = useWatch({ control: form.control, name }) ?? 0;
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixQty
        decimals={decimals}
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
