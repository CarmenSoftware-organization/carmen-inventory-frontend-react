import { memo } from "react";
import { useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { InputAmount } from "@/components/ui/input/input-amount";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { PR_ITEM_PRICELIST_COMPARE_TYPE } from "@/types/purchase-request";
import {
  EXCHANGE_RATE_DECIMALS,
  formatCurrency,
  round2,
} from "@/lib/currency-utils";
import { resolveApprovedQty, type PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "../pr-item-cells/helpers";
import { PrLastReceivingInfo } from "../pr-last-receiving-info";
import { PrDiscountInput, PrTaxInput } from "../pr-money-fields";

/** ค่าว่างของ "ข้อความ" — ช่องที่เป็นตัวเลขไม่ใช้ ขึ้น 0.00 ตามรูปแบบสกุลเงินแทน */
const EMPTY = "—";

interface CellProps {
  readonly form: UseFormReturn<PrFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}

/**
 * แปลงเป็นสกุลหลักของกิจการ — คืน `null` เมื่อรายการนี้ซื้อด้วยสกุลหลักอยู่แล้ว
 *
 * หน้าเดิมโชว์แถวยอดสกุลหลักใต้ Subtotal · Discount · Net · Tax · Total ทั้งแถว
 * (`pr-item-summary.tsx`) เฉพาะตอนสกุลของรายการต่างจากสกุลหลัก v2 แตกเป็นบรรทัด
 * เล็กใต้แต่ละคอลัมน์แทน เพราะไม่มีแถวกางให้วางตารางย่อย
 */
function useBaseAmount(
  form: UseFormReturn<PrFormValues>,
  index: number,
  baseCurrencyCode?: string,
): { readonly rate: number; readonly code: string } | null {
  "use no memo";
  const [exchangeRate, currencyCode] = useWatch({
    control: form.control,
    name: [
      `items.${index}.exchange_rate`,
      `items.${index}.currency_code`,
    ] as const,
  });
  if (!baseCurrencyCode || !currencyCode || currencyCode === baseCurrencyCode) {
    return null;
  }
  return { rate: Number(exchangeRate ?? 1), code: baseCurrencyCode };
}

/** บรรทัดยอดสกุลหลักใต้ช่องเงิน — ไม่ส่ง base มา (สกุลหลักอยู่แล้ว) = ไม่ขึ้นอะไร */
function BaseAmountLine({
  value,
  base,
}: {
  readonly value: number;
  readonly base: { readonly rate: number; readonly code: string } | null;
}) {
  if (!base) return null;
  return (
    <div className="text-muted-foreground text-micro tabular-nums">
      {formatCurrency(round2(value * base.rate))} {base.code}
    </div>
  );
}

/**
 * ช่องกรอกของ v2 ที่หน้าเดิมไม่มี component แยกให้ reuse (ของเดิมเขียนฝังอยู่ใน
 * pr-item-expand ทั้งก้อน) — ตรรกะยกมาตรงๆ ทั้ง side-effect ตอนเลือกค่า
 */

/** เลือกผู้ขาย — เลือกแล้วถือว่าตั้งใจอนุมัติแถวนี้ (เหมือนหน้าเดิม) */
export const Pr2VendorCell = memo(function Pr2VendorCell({
  form,
  index,
  isDisabled,
}: CellProps) {
  "use no memo";
  const value = useWatch({ control: form.control, name: `items.${index}.vendor_id` });
  const vendorName =
    useWatch({ control: form.control, name: `items.${index}.vendor_name` }) ?? "";
  const pricelistNo = useWatch({
    control: form.control,
    name: `items.${index}.pricelist_no`,
  });
  // ต้อง subscribe ผ่าน useFormState ไม่ใช่อ่าน form.formState ตรงๆ ไม่งั้นช่องนี้
  // ไม่ re-render ตอน trigger() กรอบแดงไม่ขึ้นและ aria-invalid ไม่มีใน DOM
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}.vendor_id`,
  });
  const error = errors.items?.[index]?.vendor_id?.message;
  const isRowLocked = useIsRowLocked(form.control, index);

  if (isDisabled || isRowLocked) {
    if (!vendorName) {
      return <span className="text-muted-foreground">{EMPTY}</span>;
    }
    // ชื่อผู้ขายยาวกว่าคอลัมน์เป็นเรื่องปกติ — ตัดท้ายไว้ อยากอ่านเต็มก็ hover
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="min-w-0">
              <div className="truncate">{vendorName}</div>
              {pricelistNo && (
                <div className="text-muted-foreground truncate text-xs">
                  {pricelistNo}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border max-w-[24rem] rounded-lg border px-3 py-2 shadow-md"
          >
            <p className="text-xs font-semibold wrap-break-word">{vendorName}</p>
            {pricelistNo && (
              <p className="text-muted-foreground mt-1 text-micro">
                {pricelistNo}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="min-w-0">
      <LookupVendor
        value={value ?? ""}
        onValueChange={(v) => {
          form.setValue(`items.${index}.vendor_id`, v, {
            shouldDirty: true,
            shouldValidate: true,
          });
          if (v) {
            form.setValue(`items.${index}.stage_status`, "approve");
            form.setValue(`items.${index}.current_stage_status`, "approve");
          }
        }}
        className="h-8 w-full min-w-0 text-xs"
        error={error}
      />
      {/* เลขที่ใบเสนอราคาที่ราคานี้มาจาก — หน้าเดิมมีช่อง Pricelist แยกที่เห็น
          ตลอด ทั้งตอนแก้และตอนอ่าน ไม่ใช่โผล่เฉพาะตอนอ่าน */}
      {pricelistNo && (
        <div className="text-muted-foreground mt-0.5 truncate text-micro">
          {pricelistNo}
        </div>
      )}
    </div>
  );
});

/** ราคาต่อหน่วย — กรอกเองแล้วเปลี่ยน pricelist_type เป็น manual (เหมือนหน้าเดิม) */
export const Pr2UnitPriceCell = memo(function Pr2UnitPriceCell({
  form,
  index,
  isDisabled,
  buCode,
  baseCurrencyCode,
}: CellProps & {
  readonly buCode?: string;
  readonly baseCurrencyCode?: string;
}) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const base = useBaseAmount(form, index, baseCurrencyCode);
  const [price, decimals] = useWatch({
    control: form.control,
    name: [
      `items.${index}.pricelist_price`,
      `items.${index}.currency_decimal_places`,
    ] as const,
  });
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}.pricelist_price`,
  });
  const error = errors.items?.[index]?.pricelist_price?.message;

  // ต้นทุนครั้งล่าสุดที่รับของเข้ามา — หน้าเดิมแขวนไว้ที่ label "U.Price" ในแถวที่กาง
  // (`pr-item-expand.tsx`) v2 ไม่มีแถวกาง เลยย้ายมาแขวนข้างช่องราคาโดยตรง
  // ยิง API เฉพาะตอน hover อยู่แล้ว 100 แถวจึงไม่ได้แปลว่า 100 request
  const lastReceiving = (
    <PrLastReceivingInfo control={form.control} index={index} buCode={buCode} />
  );

  if (isDisabled || isRowLocked) {
    return (
      <div className="flex items-center justify-between gap-1">
        {lastReceiving}
        <div>
          <div className="tabular-nums">
            {formatCurrency(Number(price ?? 0))}
          </div>
          {/* ไม่ย้ำสกุลของรายการที่นี่ — มีคอลัมน์สกุลเงินบอกอยู่แล้ว
              เหลือแค่ยอดที่แปลงเป็นสกุลหลัก ซึ่งไม่มีคอลัมน์ไหนบอก */}
          <BaseAmountLine value={Number(price ?? 0)} base={base} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1">
      {lastReceiving}
      {/* กล่อง input ต้องยืดเต็มที่ว่าง — flex-1 ต้องอยู่ที่ตัวห่อ ไม่ใช่ที่ input
          (InputAmount ห่อ input ไว้อีกชั้นเมื่อมี error icon) */}
      <div className="min-w-0 flex-1">
        <InputAmount
          decimals={decimals ?? 2}
          className="h-8 w-full text-right text-xs"
          error={error}
          errorIconAlign="left"
          value={Number(price ?? 0)}
          onValueChange={(n) => {
            form.setValue(`items.${index}.pricelist_price`, n, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue(
              `items.${index}.pricelist_type`,
              PR_ITEM_PRICELIST_COMPARE_TYPE.MANUAL_INPUT,
            );
          }}
        />
        <BaseAmountLine value={Number(price ?? 0)} base={base} />
      </div>
    </div>
  );
});

/** ปุ่ม override ของ discount/tax — ปิด = คิดจาก rate, เปิด = กรอกยอดเอง */
function OverrideBox({
  form,
  index,
  field,
}: CellProps & {
  readonly field: "is_discount_adjustment" | "is_tax_adjustment";
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const checked = useWatch({
    control: form.control,
    name: `items.${index}.${field}`,
  });
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1">
      <Checkbox
        checked={checked ?? false}
        onCheckedChange={(c) =>
          form.setValue(`items.${index}.${field}`, c === true, {
            shouldDirty: true,
          })
        }
        className="size-3"
      />
      <span className="text-muted-foreground text-micro-legal select-none">
        {tfl("override")}
      </span>
    </label>
  );
}

/** ส่วนลด — % เมื่อ override ปิด, ยอดเมื่อ override เปิด */
export const Pr2DiscountCell = memo(function Pr2DiscountCell({
  form,
  index,
  isDisabled,
  baseCurrencyCode,
}: CellProps & { readonly baseCurrencyCode?: string }) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const base = useBaseAmount(form, index, baseCurrencyCode);
  const [rate, amount, decimals] = useWatch({
    control: form.control,
    name: [
      `items.${index}.discount_rate`,
      `items.${index}.discount_amount`,
      `items.${index}.currency_decimal_places`,
    ] as const,
  });

  if (isDisabled || isRowLocked) {
    return (
      <div>
        <div className="tabular-nums">
          {formatCurrency(Number(amount ?? 0))}
        </div>
        {!!rate && (
          <div className="text-muted-foreground text-xs tabular-nums">
            {rate}%
          </div>
        )}
        <BaseAmountLine value={Number(amount ?? 0)} base={base} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <OverrideBox form={form} index={index} isDisabled={false} field="is_discount_adjustment" />
      <PrDiscountInput form={form} index={index} decimals={decimals ?? 2} />
      <BaseAmountLine value={Number(amount ?? 0)} base={base} />
    </div>
  );
});

/** ภาษี — เลือก tax profile (rate มากับ profile) หรือกรอกยอดเองเมื่อ override */
export const Pr2TaxCell = memo(function Pr2TaxCell({
  form,
  index,
  isDisabled,
  baseCurrencyCode,
}: CellProps & { readonly baseCurrencyCode?: string }) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const base = useBaseAmount(form, index, baseCurrencyCode);
  const [amount, decimals, taxRate, profileName] = useWatch({
    control: form.control,
    name: [
      `items.${index}.tax_amount`,
      `items.${index}.currency_decimal_places`,
      `items.${index}.tax_rate`,
      `items.${index}.tax_profile_name`,
    ] as const,
  });

  if (isDisabled || isRowLocked) {
    return (
      <div>
        <div className="tabular-nums">
          {formatCurrency(Number(amount ?? 0))}
        </div>
        {/* ชื่อโปรไฟล์ภาษี + อัตรา — หน้าเดิมโหมดอ่านขึ้น "ชื่อโปรไฟล์ · ยอด"
            ยอดอย่างเดียวบอกไม่ได้ว่าคิดภาษีแบบไหน (vat / ไม่มี / นำเข้า) */}
        {(profileName || !!taxRate) && (
          <div className="text-muted-foreground truncate text-xs">
            {profileName}
            {profileName && !!taxRate && " · "}
            {!!taxRate && <span className="tabular-nums">{taxRate}%</span>}
          </div>
        )}
        <BaseAmountLine value={Number(amount ?? 0)} base={base} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <OverrideBox form={form} index={index} isDisabled={false} field="is_tax_adjustment" />
      <PrTaxInput form={form} index={index} decimals={decimals ?? 2} />
      <BaseAmountLine value={Number(amount ?? 0)} base={base} />
    </div>
  );
});

/**
 * อัตราแลกเปลี่ยน — ทศนิยม 5 ตำแหน่งตายตัว (ต่างจากยอดเงินที่อิงสกุล)
 * แก้ได้เฉพาะรายการที่เป็นสกุลต่างประเทศ สกุลหลักล็อกที่ 1 เหมือนหน้าเดิม
 */
export const Pr2ExchangeRateCell = memo(function Pr2ExchangeRateCell({
  form,
  index,
  isDisabled,
  baseCurrencyCode,
}: CellProps & { readonly baseCurrencyCode?: string }) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const [rate, currencyCode] = useWatch({
    control: form.control,
    name: [
      `items.${index}.exchange_rate`,
      `items.${index}.currency_code`,
    ] as const,
  });
  const isForeign =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;
  const value = Number(rate ?? 1);

  if (isDisabled || isRowLocked || !isForeign) {
    return (
      <span
        className={
          isForeign ? "tabular-nums" : "text-muted-foreground tabular-nums"
        }
      >
        {value.toFixed(EXCHANGE_RATE_DECIMALS)}
      </span>
    );
  }

  return (
    <InputAmount
      decimals={EXCHANGE_RATE_DECIMALS}
      className="h-8 w-full text-right text-xs"
      value={value}
      onValueChange={(n) =>
        form.setValue(`items.${index}.exchange_rate`, n || 1, {
          shouldDirty: true,
        })
      }
    />
  );
});

/**
 * ช่องเงินที่คำนวณล้วน — ยอดรวมย่อย (ราคา × จำนวน) · สุทธิ · ยอดรวม
 *
 * กรอกไม่ได้ทุกกรณีทุกโหมด จึงเป็นข้อความเปล่าเสมอ ไม่มี branch แก้ไข/อ่าน และ
 * **ไม่ทำเป็นกล่อง input** — หน้าเดิมห่อยอดรวมไว้ในกล่องที่ input อ่านอย่างเดียว
 * (`amount-cell.tsx`) เพราะต้องเอาช่องเลือกสกุลเงินไปแปะข้างในกล่องเดียวกัน
 * v2 แยกสกุลเงินเป็นคอลัมน์แล้ว เหตุผลนั้นหมดไป เหลือแต่กล่องที่หลอกตาว่ากรอกได้
 *
 * สุทธิกับยอดรวมอ่านจาก `net_amount`/`total_price` ที่ `usePr2AmountSync` เขียนไว้
 * ไม่คำนวณซ้ำเอง ไม่งั้นสองที่คิดคนละแบบเมื่อ override ส่วนลด/ภาษีเปิดอยู่
 */
export const Pr2DerivedAmountCell = memo(function Pr2DerivedAmountCell({
  form,
  index,
  kind,
  baseCurrencyCode,
}: Omit<CellProps, "isDisabled"> & {
  readonly kind: "subtotal" | "net" | "total";
  readonly baseCurrencyCode?: string;
}) {
  "use no memo";
  const base = useBaseAmount(form, index, baseCurrencyCode);
  const [price, requestedQty, approvedQty, netAmount, totalPrice] = useWatch({
    control: form.control,
    name: [
      `items.${index}.pricelist_price`,
      `items.${index}.requested_qty`,
      `items.${index}.approved_qty`,
      `items.${index}.net_amount`,
      `items.${index}.total_price`,
    ] as const,
  });

  let value: number;
  if (kind === "net") value = Number(netAmount ?? 0);
  else if (kind === "total") value = Number(totalPrice ?? 0);
  else {
    value =
      Number(price ?? 0) *
      resolveApprovedQty({
        approved_qty: Number(approvedQty ?? 0),
        requested_qty: Number(requestedQty ?? 0),
      });
  }

  return (
    <div>
      {/* ยอดรวมเป็นคำตอบของแถว หนากว่าตัวอื่นในกลุ่มเดียวกัน */}
      <div className={kind === "total" ? "font-semibold tabular-nums" : "tabular-nums"}>
        {formatCurrency(value)}
      </div>
      <BaseAmountLine value={value} base={base} />
    </div>
  );
});
