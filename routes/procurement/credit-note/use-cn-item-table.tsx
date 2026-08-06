import { memo, useEffect, useMemo, useState } from "react";
import {
  useWatch,
  type Control,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import {
  DiscountOverrideInput,
  OverrideToggle,
  TaxOverrideInput,
} from "@/components/procurement/discount-tax-override";
import { cn } from "@/lib/utils";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { useUnitDecimals } from "@/hooks/use-product-units";
import { formatCurrency } from "@/lib/currency-utils";
import { COMBO_COL } from "../combo-col-width";
import type { CnFormValues } from "./cn-form-schema";
import {
  computeCnItemAmounts,
  type CnCreditNoteType,
  type CnItemAmounts,
} from "./cn-item-compute";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

/**
 * ความกว้าง (px) ของคอลัมน์ — ใช้ร่วมกันระหว่างแถวหลัก (ยอดตาม GRN) กับแถวที่
 * กางออก (ฝั่งคืน) สองแถวจึงตรงคอลัมน์กัน วันไหนปรับก็ปรับที่นี่ที่เดียว
 *
 * discount/tax กว้างตาม combo ของฝั่งคืนเสมอ แม้แถวหลักจะเป็นตัวเลขล้วน —
 * ถ้าย่อตามแถวหลัก แถวกางจะไม่มีที่พอให้ [rate | ยอด | override]
 */
const CN_COL = {
  leading: 36,
  product: 200,
  location: 130,
  qty: 130,
  price: 100,
  sub: 110,
  discount: COMBO_COL.discount,
  net: 96,
  tax: COMBO_COL.tax,
  amount: 120,
  action: 40,
} as const;

/** ผลรวมความกว้างของช่วงที่แถวกางครอบ (product → amount, +action ถ้ามี) */
function cnReturnRowTotal(showActionCol: boolean): number {
  return (
    CN_COL.product +
    CN_COL.location +
    CN_COL.qty +
    CN_COL.price +
    CN_COL.sub +
    CN_COL.discount +
    CN_COL.net +
    CN_COL.tax +
    CN_COL.amount +
    (showActionCol ? CN_COL.action : 0)
  );
}

/** อ่านค่าที่ต้องใช้คำนวณของ item เดียว → computeCnItemAmounts (honor override) */
function useCnItemLine(
  form: UseFormReturn<CnFormValues>,
  index: number,
  type: CnCreditNoteType,
): CnItemAmounts {
  "use no memo";
  const [
    quantity,
    unitPrice,
    netAmount,
    discRate,
    discAmt,
    isDiscAdj,
    taxRate,
    taxAmt,
    isTaxAdj,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.net_amount`,
      `items.${index}.discount_rate`,
      `items.${index}.discount_amount`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.tax_rate`,
      `items.${index}.tax_amount`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  return computeCnItemAmounts(type, {
    quantity: Number(quantity) || 0,
    unit_price: Number(unitPrice) || 0,
    net_amount: Number(netAmount) || 0,
    discount_rate: Number(discRate) || 0,
    discount_amount: Number(discAmt) || 0,
    is_discount_adjustment: !!isDiscAdj,
    tax_rate: Number(taxRate) || 0,
    tax_amount: Number(taxAmt) || 0,
    is_tax_adjustment: !!isTaxAdj,
  });
}

/**
 * คำนวณ + set discount/net/tax/total ของ item — mount ตลอด (ทุก row) เพื่อให้ยอด
 * recompute เสมอ ตามประเภทใบลดหนี้ (quantity_return vs amount_discount)
 * — ไม่เขียนทับ net_amount ที่ผู้ใช้กรอก (amount_discount), discount_amount ที่
 * override (is_discount_adjustment) หรือ tax_amount ที่ override (is_tax_adjustment)
 */
export const CnItemComputedSync = memo(function CnItemComputedSync({
  control,
  form,
  index,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const type = useWatch({ control, name: "credit_note_type" });
  const [isDiscAdj, isTaxAdj] = useWatch({
    control,
    name: [
      `items.${index}.is_discount_adjustment`,
      `items.${index}.is_tax_adjustment`,
    ] as const,
  });
  const { discount_amount, net_amount, tax_amount, total_amount } =
    useCnItemLine(form, index, type);

  useEffect(() => {
    // amount_discount → ไม่มีส่วนลดต่อบรรทัด: ล้าง override/amount ที่ค้างจาก
    // quantity_return (กันยอด/payload เพี้ยนตอนสลับประเภท)
    if (type === "amount_discount") {
      if (isDiscAdj) {
        form.setValue(`items.${index}.is_discount_adjustment`, false);
      }
      if (form.getValues(`items.${index}.discount_amount`) !== 0) {
        form.setValue(`items.${index}.discount_amount`, 0);
      }
    } else if (!isDiscAdj) {
      // discount_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
      if (
        form.getValues(`items.${index}.discount_amount`) !== discount_amount
      ) {
        form.setValue(`items.${index}.discount_amount`, discount_amount);
      }
    }
    if (form.getValues(`items.${index}.net_amount`) !== net_amount) {
      form.setValue(`items.${index}.net_amount`, net_amount);
    }
    // tax_amount: เขียนเฉพาะโหมด auto (override → คงค่า user)
    if (!isTaxAdj) {
      if (form.getValues(`items.${index}.tax_amount`) !== tax_amount) {
        form.setValue(`items.${index}.tax_amount`, tax_amount);
      }
    }
    if (form.getValues(`items.${index}.total_amount`) !== total_amount) {
      form.setValue(`items.${index}.total_amount`, total_amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [
    index,
    type,
    discount_amount,
    net_amount,
    tax_amount,
    total_amount,
    isDiscAdj,
    isTaxAdj,
  ]);

  return null;
});

/** Product — plain text เสมอ (เลือกจาก dialog แล้ว) */
function ProductCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const itemName =
    useWatch({ control, name: `items.${index}.item_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.item_local_name` }) ?? "";
  return <NameWithSubtext primary={itemName} secondary={productLocalName} />;
}

/** Location — plain text เสมอ (เลือกจาก dialog แล้ว) */
function LocationCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const locationName =
    useWatch({ control, name: `items.${index}.location_name` }) ?? "";
  const locationCode =
    useWatch({ control, name: `items.${index}.location_code` }) ?? "";
  return <NameWithSubtext primary={locationName} secondary={locationCode} />;
}

/**
 * Received — จำนวนที่รับเข้าตาม GRN บรรทัดอ้างอิง อ่านอย่างเดียวเสมอ
 * (เพดานอ้างอิงของจำนวนคืน ไม่ใช่ค่าที่ผู้ใช้กรอก และไม่เข้า payload)
 */
function ReceivedCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const received = useWatch({
    control,
    name: `items.${index}._grn_received_qty`,
  });
  const unitName =
    useWatch({ control, name: `items.${index}.unit_name` }) ?? "";
  return (
    <InputSuffixPlain
      className="w-full"
      // null = ยังไม่ได้ค่าจาก GRN — ขีดไว้ ไม่โชว์ 0 ให้เข้าใจผิดว่ารับมา 0
      value={received == null ? "—" : String(received)}
      suffix={unitName}
    />
  );
}

/** Return qty (+unit) — จำนวนที่คืน = ตัวตั้งของทุกยอดในแถว · amount_discount ล็อก (ref) */
function QtyCell({
  form,
  index,
  disabled,
  locked,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  locked: boolean;
}) {
  "use no memo";
  const quantity = useWatch({
    control: form.control,
    name: `items.${index}.quantity`,
  });
  const unitName =
    useWatch({ control: form.control, name: `items.${index}.unit_name` }) ?? "";
  const grnReceivedQty = useWatch({
    control: form.control,
    name: `items.${index}._grn_received_qty`,
  });
  const error = form.formState.errors.items?.[index]?.quantity?.message;
  const productId =
    useWatch({ control: form.control, name: `items.${index}.item_id` }) ?? "";
  const unitId =
    useWatch({ control: form.control, name: `items.${index}.unit_id` }) ?? "";
  // ทศนิยมที่กรอกได้มาจาก decimal_place ของหน่วยที่เลือก (master data)
  const decimals = useUnitDecimals(productId, unitId);
  if (disabled || locked) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={String(quantity ?? 0)}
        suffix={unitName}
      />
    );
  }
  // คืนเกินจำนวนที่รับ = error จาก schema (บล็อกตอน save) — กรอบแดง + ไอคอนเตือน
  // ในช่อง hover อ่านข้อความได้ แบบเดียวกับช่องราคาของ GRN/PR
  return (
    <InputSuffixField className="w-full" errorMessage={error}>
      <InputSuffixQty
        decimals={decimals}
        id={`items-${index}-quantity`}
        min={0}
        max={grnReceivedQty ?? undefined}
        placeholder="0"
        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
      />
      {unitName && (
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">{unitName}</span>
        </InputSuffixAddon>
      )}
    </InputSuffixField>
  );
}

/** ยอดฝั่ง GRN ช่องหนึ่ง — อ่านอย่างเดียว (ไม่เข้า payload) */
function GrnAmountCell({
  control,
  index,
  field,
}: {
  control: Control<CnFormValues>;
  index: number;
  field:
    | "_grn_price"
    | "_grn_sub_total"
    | "_grn_discount_amount"
    | "_grn_net_amount"
    | "_grn_tax_amount"
    | "_grn_total_amount";
}) {
  "use no memo";
  const value = useWatch({ control, name: `items.${index}.${field}` });
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatCurrency(Number(value) || 0)}
    </span>
  );
}

/**
 * แถวที่กางออก = ฝั่ง "คืน" ช่องกรอกทั้งหมดอยู่ที่นี่
 * table-fixed + colgroup คิดความกว้างเป็น % ของช่วงที่ครอบ (ทรงเดียวกับ
 * LocationsEditor ของ PO) — ใช้ px ตรง ๆ ไม่ได้เพราะตารางหลัก scroll แนวนอน
 */
function CnReturnRow({
  form,
  index,
  type,
  disabled,
  showActionCol,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
  showActionCol: boolean;
}) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const isAmountDiscountRow = type === "amount_discount";
  const denom = cnReturnRowTotal(showActionCol);
  const pct = (px: number) => `${(px / denom) * 100}%`;

  return (
    <table className="w-full table-fixed text-xs">
      <colgroup>
        {/* ป้าย "คืน" กินที่ของ product + location รวมกัน */}
        <col style={{ width: pct(CN_COL.product + CN_COL.location) }} />
        <col style={{ width: pct(CN_COL.qty) }} />
        <col style={{ width: pct(CN_COL.price) }} />
        <col style={{ width: pct(CN_COL.sub) }} />
        <col style={{ width: pct(CN_COL.discount) }} />
        <col style={{ width: pct(CN_COL.net) }} />
        <col style={{ width: pct(CN_COL.tax) }} />
        <col style={{ width: pct(CN_COL.amount) }} />
        {showActionCol && <col style={{ width: pct(CN_COL.action) }} />}
      </colgroup>
      <tbody>
        {/* h-10 + px-3 py-1 = ระยะเดียวกับเซลล์ของตารางหลักเป๊ะ ๆ เดิมแถวคืนใช้
            px-2/px-1 และไม่มีความสูงขั้นต่ำ แถบจึงเตี้ยกว่าแถวหลักที่ชื่อสินค้า
            กินสองบรรทัด อ่านแล้วเหมือนคนละตาราง */}
        <tr className="h-10 align-middle">
          {/* ป้ายบอกว่าแถวนี้คือของที่คืน — อยู่ท้ายช่วง product+location ชิดขวา
              ติดกับช่องค่าแรก · เดิมวางซ้อนอยู่เหนือค่า ทำให้ค่าในช่องนี้ต่ำกว่า
              ค่าช่องอื่นทั้งแถว อ่านแล้วไม่เป็นแนวเดียวกัน */}
          <td className="text-muted-foreground text-micro px-3 py-1 text-right font-semibold">
            {isAmountDiscountRow ? t("cnAmount") : t("returnLine")}
          </td>
          {/* ช่องกรอกของแถวอยู่ตรงนี้ช่องเดียว สลับตามประเภทใบ — quantity_return
              กรอกจำนวนคืน, amount_discount กรอกยอดลดหนี้ตรง ๆ (จำนวนคืนไม่มีผล
              ต่อยอดในโหมดนั้น จึงไม่ต้องมีช่องล็อกไว้ให้รก) */}
          <td className="px-3 py-1 text-right">
            {isAmountDiscountRow ? (
              <SubtotalCell
                form={form}
                index={index}
                type={type}
                disabled={disabled}
              />
            ) : (
              <QtyCell
                form={form}
                index={index}
                disabled={disabled}
                locked={false}
              />
            )}
          </td>
          {/* ราคาต่อหน่วยเท่าฝั่งรับเสมอ — คืนของชิ้นเดิมในราคาเดิม */}
          <td className="px-3 py-1 text-right">
            <PriceCell control={form.control} index={index} />
          </td>
          {/* ช่องกรอกย้ายไปอยู่ช่องแรกของแถวแล้ว ตรงนี้จึงเป็นยอดอ่านอย่างเดียว
              ทั้งสองโหมด (amount_discount → subtotal = ยอดที่กรอกเอง) */}
          <td className="px-3 py-1 text-right">
            <LineSubtotalText form={form} index={index} type={type} />
          </td>
          <td className="px-3 py-1 text-right">
            <DiscountCell
              form={form}
              index={index}
              type={type}
              disabled={disabled}
            />
          </td>
          <td className="px-3 py-1 text-right">
            <NetCell control={form.control} index={index} />
          </td>
          <td className="px-3 py-1 text-right">
            <TaxCell
              form={form}
              index={index}
              type={type}
              disabled={disabled}
            />
          </td>
          <td className="px-3 py-1 text-right">
            <TotalCell control={form.control} index={index} />
          </td>
          {showActionCol && <td className="px-3 py-1" />}
        </tr>
      </tbody>
    </table>
  );
}

/** Price — plain text เสมอ (ล็อกจาก GRN) */
function PriceCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <InputSuffixPlain
      className="w-full"
      value={formatCurrency(Number(price) || 0)}
    />
  );
}

/**
 * Subtotal / CN amount — ช่องเดียวกัน สลับความหมายตามประเภทใบ
 * `quantity_return` → subtotal = จำนวนคืน × ราคา (read-only)
 * `amount_discount` → กรอก "CN Amount" ตรง (เขียน net_amount)
 */
function SubtotalCell({
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
  const net = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });
  const line = useCnItemLine(form, index, type);

  if (type === "amount_discount") {
    if (disabled) {
      return (
        <span className="text-foreground text-xs font-semibold tabular-nums">
          {formatCurrency(Number(net) || 0)}
        </span>
      );
    }
    // ยอดลดหนี้ต้อง > 0 (schema) — กรอบแดง + ไอคอนเตือนในช่อง เหมือนช่องจำนวนคืน
    return (
      <InputSuffixField
        className="w-full"
        errorMessage={form.formState.errors.items?.[index]?.net_amount?.message}
      >
        <InputSuffixInput
          id={`items-${index}-cn-amount`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...form.register(`items.${index}.net_amount`, {
            valueAsNumber: true,
          })}
        />
      </InputSuffixField>
    );
  }
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(line.sub_total)}
    </span>
  );
}

/** ยอดรวมย่อยของฝั่งคืน (read-only) — qty × price หรือยอดที่กรอกเองแล้วแต่ประเภทใบ */
function LineSubtotalText({
  form,
  index,
  type,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
}) {
  "use no memo";
  const line = useCnItemLine(form, index, type);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(line.sub_total)}
    </span>
  );
}

/** Net — subtotal − discount (read-only) */
function NetCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const net = useWatch({ control, name: `items.${index}.net_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(net) || 0)}
    </span>
  );
}

/**
 * Discount — override toggle + rate/amount combo (shared) เฉพาะ quantity_return
 * (amount_discount กรอก CN amount ตรง → ไม่มีส่วนลดต่อบรรทัด)
 */
function DiscountCell({
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
    return (
      <span className="block text-right text-xs tabular-nums">
        {rate}% · {formatCurrency(amount)}
      </span>
    );
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

/** Tax — override toggle + tax-profile/amount combo (shared, แบบ GRN/PO) */
function TaxCell({
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

/** ยอดรวม (plain text) */
function TotalCell({
  control,
  index,
}: {
  control: Control<CnFormValues>;
  index: number;
}) {
  "use no memo";
  const v = useWatch({ control, name: `items.${index}.total_amount` });
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(v) || 0)}
    </span>
  );
}

interface UseCnItemTableOptions {
  form: UseFormReturn<CnFormValues>;
  itemFields: CnItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
}

export function useCnItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
}: UseCnItemTableOptions) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const type = useWatch({
    control: form.control,
    name: "credit_note_type",
  }) as CnCreditNoteType;
  const isAmountDiscount = type === "amount_discount";

  const columns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    } as const;

    // กางเพื่อกรอกฝั่งคืน — แถวหลักเป็นยอดตาม GRN (ทรงเดียวกับ PO ที่กางดู location)
    const expandColumn: ColumnDef<CnItemField> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: CN_COL.leading,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        // เริ่มที่คอลัมน์ Product — ข้าม expand + # ให้ตรงขอบเดียวกับแถวหลัก
        expandedColStart: 2,
        expandedContent: (item: CnItemField) => (
          <CnReturnRow
            form={form}
            index={Math.max(
              itemFields.findIndex((field) => field.id === item.id),
              0,
            )}
            type={type}
            disabled={disabled}
            showActionCol={!disabled}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<CnItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: CN_COL.leading,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    // แถวหลัก = ยอดของบรรทัดตาม GRN ที่รับมาจริง อ่านอย่างเดียวทั้งแถว
    // ฝั่งคืน (ช่องกรอกทั้งหมด) อยู่ในแถวที่กางออก ตรงคอลัมน์กันพอดี
    const dataColumns: ColumnDef<CnItemField>[] = [
      {
        accessorKey: "item_id",
        header: tfl("product"),
        size: CN_COL.product,
        cell: ({ row }) => (
          <ProductCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "location_id",
        header: tfl("location"),
        size: CN_COL.location,
        cell: ({ row }) => (
          <LocationCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "received_qty",
        header: tfl("received"),
        size: CN_COL.qty,
        meta: rightMeta,
        cell: ({ row }) => (
          <ReceivedCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "grn_price",
        header: tfl("price"),
        size: CN_COL.price,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_price"
          />
        ),
      },
      {
        id: "grn_sub_total",
        header: tfl("subtotal"),
        size: CN_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_sub_total"
          />
        ),
      },
      {
        id: "grn_discount",
        header: tfl("discount"),
        size: CN_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_discount_amount"
          />
        ),
      },
      {
        id: "grn_net",
        header: tfl("net"),
        size: CN_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_net_amount"
          />
        ),
      },
      {
        id: "grn_tax",
        header: tfl("tax"),
        size: CN_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_tax_amount"
          />
        ),
      },
      {
        id: "grn_total",
        header: tfl("amount"),
        size: CN_COL.amount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_total_amount"
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<CnItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: CN_COL.action,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      expandColumn,
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        // h-10 ตายตัวทั้งแถวหลักและแถวคืน (ดู CnReturnRow) — ปล่อยให้สูงตาม
        // เนื้อหา แถวหลักจะ 39px เพราะชื่อสินค้ากินสองบรรทัด ส่วนแถวคืนบรรทัด
        // เดียวได้ 24px สองแถบเลยไม่เท่ากันทั้งที่เป็นรายการเดียวกัน
        cellClassName: cn("h-10 py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [form, disabled, isAmountDiscount, type, itemFields, t, tfl, onDelete]);

  // กางทุกแถวไว้ตั้งแต่แรกเสมอ — ฝั่งคืนคือสาระของใบลดหนี้ ไม่ใช่รายละเอียดเสริม
  // (โหมดแก้ต้องกรอกทุกบรรทัดอยู่แล้ว โหมดอ่านก็ต้องเห็นว่าคืนอะไรไปเท่าไหร่)
  // พับเองได้ถ้าอยากกวาดตาดูเฉพาะยอดตาม GRN
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const table = useReactTable({
    data: itemFields,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => row.id,
  });

  return table;
}
