import { memo } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
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
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { PR_ITEM_PRICELIST_COMPARE_TYPE } from "@/types/purchase-request";
import {
  EXCHANGE_RATE_DECIMALS,
  formatCurrency,
} from "@/lib/currency-utils";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "../pr-item-cells/helpers";
import { PrLastReceivingInfo } from "../pr-last-receiving-info";

/** ค่าว่างของ "ข้อความ" — ช่องที่เป็นตัวเลขไม่ใช้ ขึ้น 0.00 ตามรูปแบบสกุลเงินแทน */
const EMPTY = "—";

interface CellProps {
  readonly form: UseFormReturn<PrFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
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
  const error = form.formState.errors.items?.[index]?.vendor_id?.message;
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
              <p className="text-muted-foreground mt-1 text-[0.6875rem]">
                {pricelistNo}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
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
  );
});

/** ราคาต่อหน่วย — กรอกเองแล้วเปลี่ยน pricelist_type เป็น manual (เหมือนหน้าเดิม) */
export const Pr2UnitPriceCell = memo(function Pr2UnitPriceCell({
  form,
  index,
  isDisabled,
  buCode,
}: CellProps & { readonly buCode?: string }) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const currencyCode =
    useWatch({ control: form.control, name: `items.${index}.currency_code` }) ??
    "";
  const [price, decimals] = useWatch({
    control: form.control,
    name: [
      `items.${index}.pricelist_price`,
      `items.${index}.currency_decimal_places`,
    ] as const,
  });
  const error = form.formState.errors.items?.[index]?.pricelist_price?.message;

  // ต้นทุนครั้งล่าสุดที่รับของเข้ามา — หน้าเดิมแขวนไว้ที่ label "U.Price" ในแถวที่กาง
  // (`pr-item-expand.tsx`) v2 ไม่มีแถวกาง เลยย้ายมาแขวนข้างช่องราคาโดยตรง
  // ยิง API เฉพาะตอน hover อยู่แล้ว 100 แถวจึงไม่ได้แปลว่า 100 request
  const lastReceiving = (
    <PrLastReceivingInfo control={form.control} index={index} buCode={buCode} />
  );

  if (isDisabled || isRowLocked) {
    return (
      <div className="flex items-start justify-end gap-1">
        {lastReceiving}
        <div>
          <div className="tabular-nums">
            {formatCurrency(Number(price ?? 0))}
          </div>
          {currencyCode && (
            <div className="text-muted-foreground text-xs">{currencyCode}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
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
      <span className="text-muted-foreground text-[0.625rem] select-none">
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
}: CellProps) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const [rate, isAdj, amount, decimals] = useWatch({
    control: form.control,
    name: [
      `items.${index}.discount_rate`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.discount_amount`,
      `items.${index}.currency_decimal_places`,
    ] as const,
  });
  const override = isAdj ?? false;

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
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {override ? (
        <InputAmount
          decimals={decimals ?? 2}
          className="h-8 w-full text-right text-xs"
          value={Number(amount ?? 0)}
          onValueChange={(n) =>
            form.setValue(`items.${index}.discount_amount`, n, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      ) : (
        <InputAmount
          decimals={2}
          className="h-8 w-full text-right text-xs"
          value={Number(rate ?? 0)}
          onValueChange={(n) =>
            // clamp 0–100 เหมือนหน้าเดิม
            form.setValue(
              `items.${index}.discount_rate`,
              Math.min(100, Math.max(0, n)),
              { shouldDirty: true, shouldValidate: true },
            )
          }
        />
      )}
      <OverrideBox form={form} index={index} isDisabled={false} field="is_discount_adjustment" />
    </div>
  );
});

/** ภาษี — เลือก tax profile (rate มากับ profile) หรือกรอกยอดเองเมื่อ override */
export const Pr2TaxCell = memo(function Pr2TaxCell({
  form,
  index,
  isDisabled,
}: CellProps) {
  "use no memo";
  const isRowLocked = useIsRowLocked(form.control, index);
  const [profileId, isAdj, amount, decimals, taxRate] = useWatch({
    control: form.control,
    name: [
      `items.${index}.tax_profile_id`,
      `items.${index}.is_tax_adjustment`,
      `items.${index}.tax_amount`,
      `items.${index}.currency_decimal_places`,
      `items.${index}.tax_rate`,
    ] as const,
  });
  const override = isAdj ?? false;
  const error = form.formState.errors.items?.[index]?.tax_profile_id?.message;

  if (isDisabled || isRowLocked) {
    return (
      <div>
        <div className="tabular-nums">
          {formatCurrency(Number(amount ?? 0))}
        </div>
        {!!taxRate && (
          <div className="text-muted-foreground text-xs tabular-nums">
            {taxRate}%
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <LookupTaxProfile
        value={profileId ?? ""}
        onValueChange={(value, rate, name) => {
          form.setValue(`items.${index}.tax_profile_id`, value || null, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue(`items.${index}.tax_rate`, rate);
          form.setValue(`items.${index}.tax_profile_name`, name);
        }}
        className={`h-8 w-full min-w-0 text-xs ${error ? "border-destructive" : ""}`}
      />
      {override && (
        <InputAmount
          decimals={decimals ?? 2}
          className="h-8 w-full text-right text-xs"
          value={Number(amount ?? 0)}
          onValueChange={(n) =>
            form.setValue(`items.${index}.tax_amount`, n, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      )}
      <OverrideBox form={form} index={index} isDisabled={false} field="is_tax_adjustment" />
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
