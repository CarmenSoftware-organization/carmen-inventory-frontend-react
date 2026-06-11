
import { useState } from "react";
import { useTranslations } from "use-intl";
import { usePhysicalCountPeriod } from "@/hooks/use-physical-count-period";
import { formatDate } from "@/lib/date-utils";
import type { PhysicalCountPeriod } from "@/types/physical-count-period";
import { LookupCombobox } from "./lookup-combobox";

interface LookupPhysicalCountPeriodProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (item: PhysicalCountPeriod) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * ฟังก์ชันช่วยเหลือ formatPeriodLabel สำหรับ Lookup สำหรับเลือกรอบการนับสต็อก (Physical Count Period)
 * @param props - props ของ formatPeriodLabel (ภาษาไทย)
 * @returns ผลลัพธ์ของฟังก์ชัน
 */
function formatPeriodLabel(period: PhysicalCountPeriod): string {
  const from = formatDate(period.counting_period_from_date, "DD MMM YYYY");
  const to = formatDate(period.counting_period_to_date, "DD MMM YYYY");
  return `${from} — ${to}`;
}

/**
 * Lookup Popover สำหรับเลือกรอบการนับสต็อก (Physical Count Period)
 *
 * ดึงข้อมูลผ่าน `usePhysicalCountPeriod({ perpage: -1 })` และ filter เฉพาะรอบที่เริ่มแล้ว
 * (counting_period_from_date <= today) เรียงจากใหม่ไปเก่า แสดงเป็นช่วงวันที่
 * มี `onItemChange` ส่ง object `PhysicalCountPeriod` เต็ม
 *
 * @param value - id ของ period ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ physical count period lookup
 * @example
 * ```tsx
 * <Controller name="period_id" control={form.control} render={({ field }) => (
 *   <LookupPhysicalCountPeriod value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupPhysicalCountPeriod({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupPhysicalCountPeriodProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const { data, isLoading } = usePhysicalCountPeriod(
    { perpage: -1 },
    { enabled: hasOpened || !!value },
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const periods = (data?.data ?? [])
    .filter((p) => new Date(p.counting_period_from_date) <= today)
    .sort(
      (a, b) =>
        new Date(b.counting_period_from_date).getTime() -
        new Date(a.counting_period_from_date).getTime(),
    );

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={periods}
      getId={(p) => p.id}
      getLabel={formatPeriodLabel}
      getSearchValue={(p) => formatPeriodLabel(p)}
      placeholder={placeholder ?? tl("select", { entity: tfl("physicalCountPeriod") })}
      searchPlaceholder={tl("search", { entity: tfl("physicalCountPeriod") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      error={error}
    />
  );
}
