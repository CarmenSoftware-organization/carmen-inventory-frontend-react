import { type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { InputAmount } from "@/components/ui/input/input-amount";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

/**
 * ยอดภาษีของบรรทัดคืน — `quantity_return` กรอกเองได้, `amount_discount` คิดจาก
 * net × rate ของโปรไฟล์ที่ติดมากับบรรทัด GRN อ่านอย่างเดียว
 */
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
  const line = useCnItemLine(form, index, type);
  const amount = line.tax_amount;

  if (disabled || type !== "quantity_return") {
    return (
      <span className="block text-right text-xs tabular-nums">
        {formatCurrency(amount)}
      </span>
    );
  }
  return (
    <InputAmount
      aria-label={tfl("taxAmt")}
      className="h-8 w-full text-right text-xs"
      value={amount}
      onValueChange={(a) => {
        // แตะช่องนี้ = override ทันที ไม่งั้น computed-sync เขียนทับด้วย net × rate
        if (!form.getValues(`${base}.is_tax_adjustment`)) {
          form.setValue(`${base}.is_tax_adjustment`, true, {
            shouldDirty: true,
          });
        }
        form.setValue(`${base}.tax_amount`, a, { shouldDirty: true });
      }}
    />
  );
}
