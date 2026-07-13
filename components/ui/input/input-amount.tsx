import * as React from "react";

import { FieldInput } from "@/components/ui/field";
import { useProfile } from "@/hooks/use-profile";

type FieldInputProps = React.ComponentProps<typeof FieldInput>;
type InputAmountBaseProps = Omit<
  FieldInputProps,
  "type" | "step" | "inputMode" | "value" | "defaultValue" | "onChange"
>;

interface AmountInputProps extends InputAmountBaseProps {
  /** Override max decimal places (e.g. per-item currency decimals). Falls back to default currency from profile. */
  readonly decimals?: number;
  /** จำนวนเงินปัจจุบัน (controlled) — แหล่งความจริงคือ form value */
  readonly value: number;
  /** เรียกเมื่อค่าเปลี่ยน ส่งเป็น number (0 เมื่อว่าง/ไม่ใช่ตัวเลข) */
  readonly onValueChange: (value: number) => void;
}

/** ตัดอักขระที่ไม่ใช่ตัวเลข/จุด, เหลือจุดเดียว, จำกัดทศนิยมไม่เกิน decimals */
function sanitizeAmount(raw: string, decimals: number): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s;
  // รวมเป็นจุดเดียว (ตัดจุดที่เกินหลังตัวแรกทิ้ง)
  s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  if (decimals <= 0) return s.slice(0, firstDot);
  const extra = s.length - firstDot - 1 - decimals;
  return extra > 0 ? s.slice(0, s.length - extra) : s;
}

/** format ค่าตัวเลขเป็นทศนิยมคงที่สำหรับแสดงตอนไม่โฟกัส (10 → "10.00") */
function formatFixed(value: number, decimals: number): string {
  if (value == null || Number.isNaN(value)) return "";
  return Number(value).toFixed(decimals);
}

/**
 * InputAmount — ช่องกรอกจำนวนเงิน (controlled)
 * - default decimals จาก `default_currency.decimal_places` (fallback 2), override ผ่าน `decimals`
 * - ตอน **ไม่โฟกัส** แสดงทศนิยมคงที่ (เช่น `10.00`); ตอน **โฟกัส** แก้ไขค่าดิบได้อิสระ
 * - กันพิมพ์ทศนิยมเกิน `decimals` และอักขระที่ไม่ใช่ตัวเลข
 * - เป็น text input (ไม่ใช่ number) เพื่อคง trailing zeros; ส่งค่ากลับเป็น number ผ่าน `onValueChange`
 * - รองรับ `error` + `errorIconAlign` ส่งผ่านไปยัง FieldInput
 */
export function InputAmount({
  decimals,
  value,
  onValueChange,
  placeholder,
  onFocus,
  onBlur,
  ...props
}: AmountInputProps) {
  const { defaultBu } = useProfile();
  const resolvedDecimals =
    decimals ?? defaultBu?.config?.default_currency?.decimal_places ?? 2;

  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const computedPlaceholder =
    placeholder ??
    (resolvedDecimals > 0 ? `0.${"0".repeat(resolvedDecimals)}` : "0");

  // ไม่โฟกัส → ค่าที่ format แล้ว (source of truth = value); โฟกัส → draft ที่กำลังพิมพ์
  const display = focused ? draft : formatFixed(value, resolvedDecimals);

  return (
    <FieldInput
      type="text"
      inputMode="decimal"
      placeholder={computedPlaceholder}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        // เริ่มแก้จากค่าดิบ (ไม่มี trailing zeros กวน) — 0 → ช่องว่าง
        setDraft(value ? String(value) : "");
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = sanitizeAmount(e.currentTarget.value, resolvedDecimals);
        setDraft(next);
        const n = Number.parseFloat(next);
        onValueChange(Number.isNaN(n) ? 0 : n);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
}
