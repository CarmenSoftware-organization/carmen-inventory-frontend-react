import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { formatCurrency } from "@/lib/currency-utils";
import {
  DiscountOverrideInput,
  OverrideToggle,
} from "../../shared/discount-tax-override";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

/**
 * Discount — override toggle + rate/amount combo (shared) เฉพาะ quantity_return
 * (amount_discount กรอก CN amount ตรง → ไม่มีส่วนลดต่อบรรทัด)
 */
/**
 * ยอดเงินบรรทัดบน + เปอร์เซ็นต์เป็นบรรทัดรอง (โหมดอ่านของคอลัมน์ส่วนลด/ภาษี)
 *
 * ใช้ของกลางตัวเดียวกับคอลัมน์ชื่อสินค้า/คลัง ทรงบรรทัดรองจะได้เปลี่ยนที่เดียว
 */
function RateSubtext({
  amount,
  rate,
}: {
  readonly amount: number;
  readonly rate: number;
}) {
  return (
    <NameWithSubtext
      align="end"
      primary={formatCurrency(amount)}
      secondary={rate > 0 ? `${rate}%` : undefined}
    />
  );
}

export function DiscountCell({
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
  const rate =
    useWatch({ control: form.control, name: `${base}.discount_rate` }) ?? 0;
  const isAdj =
    useWatch({
      control: form.control,
      name: `${base}.is_discount_adjustment`,
    }) ?? false;
  const line = useCnItemLine(form, index, type);
  const amount = line.discount_amount;

  if (type === "amount_discount") {
    // โหมดนี้ไม่มีส่วนลดต่อบรรทัด — ยอดเป็น 0 จริง ๆ ไม่ใช่ "ไม่มีข้อมูล"
    // ช่องตัวเลขต้องขึ้นตัวเลข คนอ่านจะได้เอาไปบวกลบกับคอลัมน์อื่นได้เลย
    return (
      <span className="block text-right text-xs tabular-nums">
        {formatCurrency(0)}
      </span>
    );
  }
  if (disabled) {
    return <RateSubtext amount={amount} rate={Number(rate) || 0} />;
  }
  return (
    // checkbox อยู่ข้างช่องกรอก ไม่ใช่ลอยเป็นบรรทัดของตัวเองเหนือช่อง — เซลล์แคบ
    // อยู่แล้ว เสียไปทั้งบรรทัดเพื่อ checkbox ตัวเดียวไม่คุ้ม (ท่าเดียวกับ GRN/PO)
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
