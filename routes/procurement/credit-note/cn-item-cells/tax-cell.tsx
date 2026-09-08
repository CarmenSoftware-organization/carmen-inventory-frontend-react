import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { formatCurrency } from "@/lib/currency-utils";
import {
  OverrideToggle,
  TaxOverrideInput,
} from "../../shared/discount-tax-override";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

/** Tax — override toggle + tax-profile/amount combo (shared, แบบ GRN/PO) */
export function TaxCell({
  form,
  index,
  type,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
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
  const line = useCnItemLine(form, index, type);
  const amount = line.tax_amount;

  if (disabled) {
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
  }
  return (
    // ไม่มีป้าย "{rate}%" ลอยเหนือช่องกรอกแล้ว — มันดันแถวให้สูงขึ้นทั้งแถว
    // และอัตราก็อ่านได้จากชื่อ tax profile ในช่องอยู่แล้ว
    // checkbox อยู่ข้างช่องกรอก ท่าเดียวกับคอลัมน์ส่วนลด
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
  );
}
