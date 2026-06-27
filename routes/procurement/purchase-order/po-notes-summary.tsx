"use no memo";

import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { round2 } from "@/lib/currency-utils";
import { OrderSummaryCard } from "./po-visual";
import type { PoFormValues } from "./po-form-schema";

interface PoNotesSummaryProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly disabled: boolean;
  /** view/locked → แสดง notes เป็น plain text แทน textarea */
  readonly plainText?: boolean;
}

/** Plain-text แสดงค่า notes ใน view/locked mode */
function PlainNote({ value }: { readonly value?: string }) {
  return (
    <p className="min-h-8 text-sm whitespace-pre-wrap">{value || "—"}</p>
  );
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
  const tfl = useTranslations("field");

  // Subscribe items + currency_code โดยตรงผ่าน useWatch — pattern เดียวกับ
  // pr-grand-total.tsx (PR module) ใช้ใน production
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const currencyCode =
    useWatch({ control: form.control, name: "currency_code" }) ?? "";

  // Compute live จาก raw leaf fields:
  // - qty = sum ของ locations.order_qty (ของจริง user แก้ที่ location row)
  // - price/discount_rate/tax_rate = field โดยตรงของ item
  // ไม่พึ่ง item.order_qty (เขียนกลับโดย OrderQtyCell.useEffect — setValue
  // chain บางครั้งไม่ trigger useWatch("items") re-render)
  const totals = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let net = 0;
    let tax = 0;
    let grand = 0;
    let qty = 0;
    for (const item of items) {
      const p = Number(item?.price ?? 0);
      const q = (item?.locations ?? []).reduce(
        (acc, l) => acc + (Number(l?.order_qty) || 0),
        0,
      );
      const dr = Number(item?.discount_rate ?? 0);
      const tr = Number(item?.tax_rate ?? 0);
      const itemSub = round2(p * q);
      const itemDisc = round2((itemSub * dr) / 100);
      const itemNet = round2(itemSub - itemDisc);
      const itemTax = round2((itemNet * tr) / 100);
      const itemTotal = round2(itemNet + itemTax);
      sub += itemSub;
      disc += itemDisc;
      net += itemNet;
      tax += itemTax;
      grand += itemTotal;
      qty += q;
    }
    return {
      sub: round2(sub),
      disc: round2(disc),
      net: round2(net),
      tax: round2(tax),
      grand: round2(grand),
      qty,
      items: items.length,
    };
  }, [items]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="po-description">{tfl("description")}</FieldLabel>
          {plainText ? (
            <PlainNote value={form.getValues("description")} />
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
        <Field>
          <FieldLabel htmlFor="po-remarks">{tfl("remarks")}</FieldLabel>
          {plainText ? (
            <PlainNote value={form.getValues("remarks")} />
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
        <Field>
          <FieldLabel htmlFor="po-note">{tfl("note")}</FieldLabel>
          {plainText ? (
            <PlainNote value={form.getValues("note")} />
          ) : (
            <Textarea
              id="po-note"
              placeholder={tfl("optional")}
              className="min-h-13 text-sm"
              rows={2}
              disabled={disabled}
              maxLength={256}
              {...form.register("note")}
            />
          )}
        </Field>
      </div>
      <OrderSummaryCard
        subTotal={totals.sub}
        net={totals.net}
        tax={totals.tax}
        discount={totals.disc}
        grandTotal={totals.grand}
        itemCount={totals.items}
        qtyCount={totals.qty}
        currencyCode={currencyCode}
      />
    </div>
  );
}
