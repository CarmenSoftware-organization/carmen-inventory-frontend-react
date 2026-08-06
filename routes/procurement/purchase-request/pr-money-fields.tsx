import {
  useFormState,
  useWatch,
  Controller,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { InputAmount } from "@/components/ui/input/input-amount";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import type { PrFormValues } from "./pr-form-schema";

/**
 * ช่องกรอกส่วนลดกับภาษีของรายการ — ก้อนเดียวจบ
 *
 * เดิมเขียนฝังอยู่ใน `pr-item-expand.tsx` ก้อนใหญ่ แยกออกมาเพื่อให้กฎ (ปุ่ม clamp,
 * ตัวคั่น, ช่องไหน disabled เมื่อ override เปิด/ปิด) อยู่ที่เดียว
 *
 * ทั้งสองตัวเป็นกล่องเดียวที่มีสองช่องในนั้น เพราะมันคือค่าเดียวกันที่กรอกได้สองทาง:
 * ปิด override = กรอกเป็น % แล้วยอดคำนวณให้ · เปิด = กรอกยอดตรงๆ แล้ว % ค้างไว้
 * ช่องที่ใช้ไม่ได้ตอนนั้นเป็นสีเทาแต่ยังเห็นค่า ไม่ใช่ซ่อนหาย
 */

/** ส่วนลด: [% ] [ยอด] — ช่องที่แก้ได้ขึ้นกับ override */
export function PrDiscountInput({
  form,
  index,
  decimals,
}: {
  readonly form: UseFormReturn<PrFormValues>;
  readonly index: number;
  readonly decimals?: number;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const [rate, isAdj, amount] = useWatch({
    control: form.control,
    name: [
      `items.${index}.discount_rate`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.discount_amount`,
    ] as const,
  });
  const override = isAdj ?? false;
  // useFormState ไม่ใช่ form.formState — ตัวหลังอ่านค่า ณ ตอนเรนเดอร์เฉยๆ ไม่ได้
  // subscribe ช่องนี้ พอ trigger() ทีหลังแล้วเกิด error ช่องจะไม่ re-render
  // กรอบแดงไม่ขึ้น และ `aria-invalid` ไม่มีใน DOM ตัวช่วยเลื่อนหน้าจอจึงหาไม่เจอ
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}.discount_amount`,
  });
  const error = errors.items?.[index]?.discount_amount?.message;

  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixInput
        id={`items-${index}-discount-rate`}
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="0.01"
        placeholder="0"
        aria-label={tfl("discPercent")}
        disabled={override}
        className="disabled:bg-muted disabled:text-muted-foreground h-8 w-12 flex-none rounded-none border-0 bg-transparent px-1 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
        defaultValue={rate ?? 0}
        {...form.register(`items.${index}.discount_rate`)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          // clamp 0–100 (ส่วนลดเกิน 100% ไม่มีความหมาย)
          form.setValue(
            `items.${index}.discount_rate`,
            Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)),
            { shouldDirty: true, shouldValidate: true },
          );
        }}
      />
      <span className="bg-muted text-muted-foreground border-border flex shrink-0 items-center self-stretch border-l px-2 text-micro-legal">
        %
      </span>
      <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <InputAmount
          id={`items-${index}-discount-amount`}
          decimals={decimals}
          disabled={!override}
          aria-label={tfl("discAmt")}
          className="disabled:bg-muted disabled:text-muted-foreground h-8 w-full rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
          value={Number(amount ?? 0)}
          onValueChange={(n) =>
            form.setValue(`items.${index}.discount_amount`, n, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>
    </InputSuffixField>
  );
}

/** ภาษี: [โปรไฟล์ภาษี] [ยอด] — อัตรามากับโปรไฟล์ แก้เองไม่ได้ */
export function PrTaxInput({
  form,
  index,
  decimals,
}: {
  readonly form: UseFormReturn<PrFormValues>;
  readonly index: number;
  readonly decimals?: number;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const [isAdj, amount] = useWatch({
    control: form.control,
    name: [
      `items.${index}.is_tax_adjustment`,
      `items.${index}.tax_amount`,
    ] as const,
  });
  const override = isAdj ?? false;
  // subscribe ทั้งสองช่องในกล่อง ไม่งั้นกรอบแดงไม่ขึ้นตอน validate (ดู PrDiscountInput)
  const { errors } = useFormState({
    control: form.control,
    name: [
      `items.${index}.tax_profile_id`,
      `items.${index}.tax_amount`,
    ] as const,
  });
  const itemErrors = errors.items?.[index];

  return (
    <Controller
      control={form.control}
      name={`items.${index}.tax_profile_id`}
      render={({ field }) => (
        <InputSuffixField
          className="w-full"
          error={
            !!itemErrors?.tax_profile_id?.message ||
            !!itemErrors?.tax_amount?.message
          }
        >
          <div className="min-w-0 flex-1">
            <LookupTaxProfile
              value={field.value ?? ""}
              onValueChange={(value, rate, name) => {
                // shouldValidate: ล้างกรอบแดงทันทีที่เลือก
                form.setValue(`items.${index}.tax_profile_id`, value || null, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                form.setValue(`items.${index}.tax_rate`, rate);
                form.setValue(`items.${index}.tax_profile_name`, name);
              }}
              className="w-full rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
          <InputAmount
            id={`items-${index}-tax-amount`}
            decimals={decimals}
            disabled={!override}
            aria-label={tfl("taxAmt")}
            className="disabled:bg-muted disabled:text-muted-foreground h-8 w-20 shrink-0 rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
            value={Number(amount ?? 0)}
            onValueChange={(n) =>
              form.setValue(`items.${index}.tax_amount`, n, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </InputSuffixField>
      )}
    />
  );
}
