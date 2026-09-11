import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  DiscountOverrideInput,
  OverrideToggle,
  TaxOverrideInput,
} from "../../shared/discount-tax-override";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "../grn-form-schema";
import { useGrnItemLine } from "./use-grn-item-line";

/** Discount cell ต่อแถว — override toggle + rate/amount combo (shared กับ PO) */
export function GrnItemDiscountCell({
  form,
  index,
  editable,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  editable: boolean;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const base = `items.${index}` as const;
  const rate =
    useWatch({ control: form.control, name: `${base}.discount_rate` }) ?? 0;
  const isAdj =
    useWatch({
      control: form.control,
      name: `${base}.is_discount_adjustment`,
    }) ?? false;
  const amount = useGrnItemLine(form, index).discountAmount;

  if (!editable) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    // checkbox อยู่ข้างช่องกรอก ไม่ใช่ลอยเป็นบรรทัดของตัวเองเหนือช่อง — เซลล์แคบ
    // อยู่แล้ว เสียไปทั้งบรรทัดเพื่อ checkbox ตัวเดียวไม่คุ้ม
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

/** Tax cell ต่อแถว — override toggle + tax-profile/amount combo (shared กับ PO) */
export function GrnItemTaxCell({
  form,
  index,
  editable,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  editable: boolean;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const base = `items.${index}` as const;
  const taxProfileId =
    useWatch({ control: form.control, name: `${base}.tax_profile_id` }) ?? null;
  const rate =
    useWatch({ control: form.control, name: `${base}.tax_rate` }) ?? 0;
  const isAdj =
    useWatch({ control: form.control, name: `${base}.is_tax_adjustment` }) ??
    false;
  const amount = useGrnItemLine(form, index).taxAmount;

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
