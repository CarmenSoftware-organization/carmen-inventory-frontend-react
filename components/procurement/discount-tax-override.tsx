import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InputAmount } from "@/components/ui/input/input-amount";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";

/**
 * Shared discount/tax override controls — ใช้ร่วมกันระหว่าง PR (item-level) และ
 * PO (per-location). props-based ไม่ผูกกับ react-hook-form typing ของฟอร์มใด
 *
 * โมเดล override: `isAdjustment=false` → amount auto จาก rate (rate แก้ได้,
 * amount disabled); `isAdjustment=true` → amount กรอกเอง (rate disabled/ค้างค่า)
 */

/**
 * Checkbox "กรอกยอดเอง" — ไม่มีคำกำกับข้าง ๆ ใช้ tooltip บอกแทน
 *
 * เดิมมีคำว่า "แก้ไขเอง" อยู่หน้า checkbox ทุกแถว ซึ่งกินความกว้างของเซลล์ที่แคบ
 * อยู่แล้ว และซ้ำกันทุกบรรทัดทั้งที่ความหมายเหมือนกันหมด
 *
 * @param hint - ข้อความใน tooltip — ให้ call site ส่งคำที่ตรงกับช่องนั้น
 *   (ยอดส่วนลด / ยอดภาษี) ไม่ส่ง = ใช้ประโยคกลาง
 */
export function OverrideToggle({
  checked,
  onCheckedChange,
  hint,
}: {
  readonly checked: boolean;
  readonly onCheckedChange: (value: boolean) => void;
  readonly hint?: string;
}) {
  const tfl = useTranslations("field");
  const label = hint ?? tfl("overrideHint");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-pointer items-center">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => onCheckedChange(!!v)}
            className="size-3.5"
            aria-label={label}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Discount: rate% + amount ในกล่องเดียว — override ตัดสินว่าช่องไหนแก้ได้ */
export function DiscountOverrideInput({
  rate,
  amount,
  isAdjustment,
  decimals,
  error,
  onRateChange,
  onAmountChange,
}: {
  readonly rate: number;
  readonly amount: number;
  readonly isAdjustment: boolean;
  readonly decimals?: number;
  readonly error?: boolean;
  readonly onRateChange: (rate: number) => void;
  readonly onAmountChange: (amount: number) => void;
}) {
  const tfl = useTranslations("field");
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixInput
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        max={100}
        placeholder="0"
        aria-label={tfl("discPercent")}
        disabled={isAdjustment}
        className="disabled:bg-muted disabled:text-muted-foreground h-8 w-12 flex-none rounded-none border-0 bg-transparent px-1 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
        value={rate}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          const clamped = Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
          onRateChange(clamped);
        }}
      />
      <span className="bg-muted text-muted-foreground border-border text-micro-legal flex shrink-0 items-center self-stretch border-l px-2">
        %
      </span>
      <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <InputAmount
          decimals={decimals}
          disabled={!isAdjustment}
          aria-label={tfl("discAmt")}
          className="disabled:bg-muted disabled:text-muted-foreground h-8 w-full rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
          value={amount}
          onValueChange={onAmountChange}
        />
      </div>
    </InputSuffixField>
  );
}

/** Tax: tax-profile lookup + amount ในกล่องเดียว — amount แก้ได้เมื่อ override */
export function TaxOverrideInput({
  taxProfileId,
  amount,
  isAdjustment,
  decimals,
  error,
  onTaxChange,
  onAmountChange,
}: {
  readonly taxProfileId: string | null;
  readonly amount: number;
  readonly isAdjustment: boolean;
  readonly decimals?: number;
  readonly error?: boolean;
  readonly onTaxChange: (value: string, rate: number, name: string) => void;
  readonly onAmountChange: (amount: number) => void;
}) {
  const tfl = useTranslations("field");
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <div className="min-w-0 flex-1">
        <LookupTaxProfile
          value={taxProfileId ?? ""}
          onValueChange={onTaxChange}
          className="w-full rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
      <InputAmount
        decimals={decimals}
        disabled={!isAdjustment}
        aria-label={tfl("taxAmt")}
        className="disabled:bg-muted disabled:text-muted-foreground h-8 w-20 shrink-0 rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
        value={amount}
        onValueChange={onAmountChange}
      />
    </InputSuffixField>
  );
}
