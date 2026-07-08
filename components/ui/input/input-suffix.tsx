import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * State ที่ InputSuffixField แชร์ให้ลูก (InputSuffixInput) ผ่าน context
 * เพื่อให้ input รับ error/disabled ของกล่องเองโดยไม่ต้องส่งซ้ำ
 */
type InputSuffixContextValue = {
  error?: boolean;
  disabled?: boolean;
};

const InputSuffixContext = React.createContext<InputSuffixContextValue>({});

/**
 * กล่อง border เดียวสำหรับจับคู่ "ค่า" (ซ้าย) กับ "suffix" (ขวา) ให้ดูเป็น
 * field เดียว — suffix เป็นได้ทั้งหน่วยนับ (kg / product unit) หรือสกุลเงิน
 * (THB / currency code) เช่น qty + unit หรือ amount + currency
 *
 * ใช้ composition: วาง <InputSuffixInput /> เป็นค่า และ <InputSuffixAddon> ครอบ
 * suffix ทางขวา (unit lookup / currency select / ข้อความ) โดย InputSuffixField
 * จัดการ focus ring / error border / disabled ร่วมของทั้งกล่องผ่าน focus-within
 * และแชร์ error/disabled ให้ InputSuffixInput ผ่าน context
 *
 * ความกว้างปล่อยให้ผู้เรียกกำหนดผ่าน className (เช่น "w-44")
 *
 * @param error - true → กล่องขึ้น border สี destructive
 * @param disabled - true → กล่อง dim (ตัว control ภายในสั่ง disabled แยกได้)
 * @param className - class เสริม (เช่นความกว้าง/ความสูง override)
 * @returns JSX element ของกล่อง group
 * @example
 * ```tsx
 * <InputSuffixField className="w-44" error={!!fieldError} disabled={disabled}>
 *   <InputSuffixInput type="number" {...register("received_qty", { valueAsNumber: true })} />
 *   <InputSuffixAddon>
 *     <LookupProductUnit productId={pid} value={unit} onValueChange={setUnit}
 *       className="h-full w-19 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0" />
 *   </InputSuffixAddon>
 * </InputSuffixField>
 * ```
 */
function InputSuffixField({
  className,
  error,
  disabled,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  error?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const ctx = React.useMemo<InputSuffixContextValue>(
    () => ({ error, disabled }),
    [error, disabled],
  );
  return (
    <InputSuffixContext.Provider value={ctx}>
      {/* role="group" intentional: ไม่มี jsx-a11y plugin ใน Vite eslint config */}
      <div
        role="group"
        data-slot="input-suffix-field"
        className={cn(
          "bg-background flex h-8 items-center overflow-hidden rounded-md border transition-[color,box-shadow]",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          error ? "border-destructive" : "border-input",
          disabled && "bg-muted/60 opacity-70",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </InputSuffixContext.Provider>
  );
}

/**
 * Input control ทางซ้ายของ InputSuffixField — ถอด border/shadow/ring ออก
 * (visual border จัดการที่กล่อง) ชิดขวา text-xs เต็มความสูงกล่อง
 *
 * รับ error/disabled จาก context ของ InputSuffixField อัตโนมัติ (override ผ่าน
 * props ได้) รองรับ spread `{...register(...)}` ของ react-hook-form ตรงๆ
 * เพราะ ref/onChange/onBlur/name ถูก forward ครบ
 *
 * @param props - props ของ input (รวม ref จาก register)
 * @returns JSX element input
 */
function InputSuffixInput({
  className,
  disabled,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<typeof Input>) {
  const ctx = React.useContext(InputSuffixContext);
  return (
    <Input
      data-slot="input-suffix-input"
      disabled={disabled ?? ctx.disabled}
      aria-invalid={ariaInvalid ?? ctx.error}
      className={cn(
        "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Slot ทางขวาของ InputSuffixField สำหรับ suffix (unit lookup / currency select /
 * ข้อความ เช่น "kg", "THB") — มี divider เส้นตั้งคั่นด้านซ้ายในตัว, shrink-0
 *
 * ตัว control ภายในควรเป็นแบบไร้ border ให้กลืนกับกล่อง (ดูตัวอย่างใน
 * InputSuffixField) กรณีไม่ต้องการเส้นคั่นส่ง divider={false}
 *
 * @param divider - แสดงเส้นคั่นด้านซ้าย (default true)
 * @param className - class เสริมของ slot
 * @returns JSX element ของ slot ขวา
 * @example
 * ```tsx
 * <InputSuffixAddon><span className="px-2 text-xs">THB</span></InputSuffixAddon>
 * ```
 */
function InputSuffixAddon({
  className,
  divider = true,
  children,
  ...props
}: React.ComponentProps<"div"> & { divider?: boolean }) {
  return (
    <div
      data-slot="input-suffix-addon"
      className={cn("flex h-full shrink-0 items-center", className)}
      {...props}
    >
      {divider && (
        <div className="bg-border h-4 w-px shrink-0" aria-hidden="true" />
      )}
      {children}
    </div>
  );
}

/**
 * เวอร์ชัน plain text (view mode) ของ InputSuffixField — แสดง "ค่า" + "suffix"
 * เป็นข้อความอ่านอย่างเดียว ชิดขวา ให้ล้อกับ layout ของกล่อง input
 *
 * เป็น presentational ล้วน: ผู้เรียก format ค่ามาเอง (เช่น Number(qty) || 0,
 * formatCurrency(amount)) และ resolve suffix เอง (ชื่อหน่วยจาก product units /
 * currency code) suffix เว้นได้ (เช่นช่องราคาที่ไม่มีหน่วยต่อท้าย)
 *
 * @param value - ส่วนค่า (format มาแล้ว) แสดงตัวหนา tabular-nums
 * @param suffix - suffix ต่อท้าย (unit / currency) แสดง muted; เว้น/ว่าง → ไม่แสดง
 * @param className - class เสริมของ wrapper (เช่นความกว้างให้ตรงกับกล่อง input)
 * @param valueClassName - override สไตล์ส่วนค่า (เช่น font/size/สี ของ total เด่น)
 * @param suffixClassName - override สไตล์ส่วน suffix (เช่นขนาดตัวอักษร)
 * @returns JSX element ข้อความ
 * @example
 * ```tsx
 * <InputSuffixPlain className="w-44" value={Number(qty) || 0} suffix={unitName} />
 * <InputSuffixPlain value={formatCurrency(total)} suffix={code}
 *   valueClassName="text-base font-semibold" />
 * ```
 */
function InputSuffixPlain({
  value,
  suffix,
  className,
  valueClassName,
  suffixClassName,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  value: React.ReactNode;
  suffix?: React.ReactNode;
  valueClassName?: string;
  suffixClassName?: string;
}) {
  return (
    <span
      data-slot="input-suffix-plain"
      className={cn(
        "shrink-0 whitespace-nowrap text-right text-xs",
        className,
      )}
      {...props}
    >
      <span className={cn("text-foreground font-medium tabular-nums", valueClassName)}>
        {value}
      </span>
      {suffix ? (
        <span
          className={cn(
            "text-muted-foreground ml-1 font-normal",
            suffixClassName,
          )}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

export {
  InputSuffixField,
  InputSuffixInput,
  InputSuffixAddon,
  InputSuffixPlain,
};
