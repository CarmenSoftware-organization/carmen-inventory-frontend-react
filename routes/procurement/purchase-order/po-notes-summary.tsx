import { useTranslations } from "use-intl";
import { type UseFormReturn } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { PoFormValues } from "./po-form-schema";

interface PoNotesSummaryProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly disabled: boolean;
  /** view/locked → แสดง notes เป็น plain text แทน textarea */
  readonly plainText?: boolean;
}

/** Plain-text แสดงค่า notes ใน view/locked mode (render เฉพาะเมื่อมี value) */
function PlainNote({ value }: { readonly value?: string }) {
  "use no memo";
  return <p className="min-h-8 text-sm whitespace-pre-wrap">{value}</p>;
}

/**
 * Section 3 — Notes & order summary
 *
 * แสดง description/remarks/note textareas ทางซ้าย + Hero `OrderSummaryCard`
 * ทางขวา. Summary subscribe items ผ่าน `useWatch` คำนวณ subtotal/net/tax/
 * discount/grand total real-time ตรงกับ pattern เดียวกับ `pr-grand-total.tsx`
 *
 * @param props.form - RHF instance ของ PO
 * @param props.disabled - disable textarea (view mode / pending)
 */
export function PoNotesSummary({
  form,
  disabled,
  plainText = false,
}: PoNotesSummaryProps) {
  "use no memo";
  const tfl = useTranslations("field");

  // view/locked แสดงเฉพาะ field ที่มี value; ตอนแก้ได้แสดง textarea เสมอ
  const descriptionValue = form.getValues("description");
  const remarksValue = form.getValues("remarks");
  const showDescription = !plainText || !!descriptionValue?.trim();
  const showRemarks = !plainText || !!remarksValue?.trim();

  // view แล้วว่างทั้งคู่ → ไม่แสดง section เลย
  if (!showDescription && !showRemarks) return null;

  // grand summary ย้ายไป footer (PoFooterAction) — ตำแหน่งเดียวกับ PR แล้ว
  return (
    <div className="grid grid-cols-2 gap-4">
      {showDescription && (
        <Field className={plainText ? "gap-1" : undefined}>
          <FieldLabel
            htmlFor="po-description"
            className={
              plainText ? "text-muted-foreground font-normal" : undefined
            }
          >
            {tfl("description")}
          </FieldLabel>
          {plainText ? (
            <PlainNote value={descriptionValue} />
          ) : (
            <Textarea
              id="po-description"
              placeholder={tfl("optional")}
              className="min-h-13 text-sm"
              rows={2}
              disabled={disabled}
              maxLength={256}
              {...form.register("description")}
            />
          )}
        </Field>
      )}
      {showRemarks && (
        <Field className={plainText ? "gap-1" : undefined}>
          <FieldLabel
            htmlFor="po-remarks"
            className={
              plainText ? "text-muted-foreground font-normal" : undefined
            }
          >
            {tfl("remarks")}
          </FieldLabel>
          {plainText ? (
            <PlainNote value={remarksValue} />
          ) : (
            <Textarea
              id="po-remarks"
              placeholder={tfl("optional")}
              className="min-h-13 text-sm"
              rows={2}
              disabled={disabled}
              maxLength={256}
              {...form.register("remarks")}
            />
          )}
        </Field>
      )}
    </div>
  );
}
