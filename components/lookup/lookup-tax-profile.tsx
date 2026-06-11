
import { useTranslations } from "use-intl";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { FieldSelect } from "@/components/ui/field";
import { useTaxProfile } from "@/hooks/use-tax-profile";

interface LookupTaxProfileProps {
  readonly value: string;
  readonly onValueChange: (
    value: string,
    taxRate: number,
    taxProfileName: string,
  ) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

/**
 * Lookup Select สำหรับเลือก Tax Profile (โปรไฟล์ภาษี)
 *
 * ใช้ `FieldSelect` เป็น base เพื่อได้ error tooltip + border แดง + icon แบบ
 * consistent กับฟอร์มอื่น ๆ ดึงข้อมูลผ่าน `useTaxProfile({ perpage: 30 })`
 * filter เฉพาะ `is_active = true` onValueChange ส่ง (id, taxRate, name)
 * พร้อมกันเพื่อ set หลาย field ใน form
 *
 * @param value - tax profile id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง (id, taxRate, taxProfileName)
 * @returns JSX select element ของ tax profile lookup
 * @example
 * ```tsx
 * <Controller name="tax_profile_id" control={control} render={({ field }) => (
 *   <LookupTaxProfile
 *     value={field.value}
 *     onValueChange={(id, rate, name) => {
 *       field.onChange(id);
 *       form.setValue("tax_rate", rate);
 *     }}
 *   />
 * )} />
 * ```
 */
export function LookupTaxProfile({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupTaxProfileProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data } = useTaxProfile({ perpage: 30 });
  const resolvedPlaceholder =
    placeholder ?? tl("select", { entity: tfl("taxProfile") });
  const taxProfiles = data?.data?.filter((t) => t.is_active) ?? [];

  return (
    <FieldSelect
      value={value || ""}
      onValueChange={(v) => {
        const profile = taxProfiles.find((tp) => tp.id === v);
        onValueChange(v, profile?.tax_rate ?? 0, profile?.name ?? "");
      }}
      disabled={disabled}
      placeholder={resolvedPlaceholder}
      className={className ?? "text-xs"}
      size={size}
      error={error}
    >
      <SelectContent>
        {taxProfiles.map((tp) => (
          <SelectItem key={tp.id} value={tp.id} className="text-xs">
            {tp.name}
          </SelectItem>
        ))}
      </SelectContent>
    </FieldSelect>
  );
}
