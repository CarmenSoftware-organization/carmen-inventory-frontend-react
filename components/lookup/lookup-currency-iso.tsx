
import { useTranslations } from "use-intl";
import { currenciesIso } from "@/constant/currencies-iso";
import { LookupCombobox } from "./lookup-combobox";

interface LookupCurrencyIsoProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกสกุลเงินตามมาตรฐาน ISO 4217
 *
 * ใช้ข้อมูลคงที่จาก constant `currenciesIso` (ไม่เรียก API) รองรับค้นหาด้วย code, name
 * หรือชื่อประเทศ แสดงผลในโหมด modal เพื่อใช้ใน dialog ซ้อน
 *
 * @param value - รหัส ISO currency ที่เลือก (เช่น "THB", "USD")
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ code
 * @returns JSX popover element ของ currency ISO lookup
 * @example
 * ```tsx
 * <Controller name="currency_code" control={form.control} render={({ field }) => (
 *   <LookupCurrencyIso value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupCurrencyIso({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupCurrencyIsoProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id) => onValueChange(id)}
      items={currenciesIso}
      getId={(c) => c.code}
      getLabel={(c) => `${c.code} — ${c.name}`}
      getSearchValue={(c) => `${c.code} ${c.name} ${c.country}`}
      renderSelected={(c) => `${c.code} — ${c.name}`}
      placeholder={placeholder ?? tl("select", { entity: tfl("currencyCode") })}
      searchPlaceholder={tl("search", { entity: tfl("currency") })}
      disabled={disabled}
      className={className}
      modal
      popoverClassName="z-60"
      error={error}
    />
  );
}
