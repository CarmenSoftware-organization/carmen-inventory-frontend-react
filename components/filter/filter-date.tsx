
import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";

interface FilterDateProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly fieldKey?: string;
  readonly className?: string;
}

/**
 * ตัวกรองช่วงวันที่สำหรับ list page
 *
 * Render `DateRangePicker` ที่ parse `value` (รูปแบบ
 * `${fieldKey}|date_range:from,to`) เป็น `{ from, to }` และ serialize
 * กลับเป็น URL filter string เมื่อเลือกวันที่ ใช้ local time methods
 * เพื่อป้องกัน timezone shift (เช่น UTC+7 คลิก 27 → UTC ได้ 26)
 * เมื่อล้างทั้งคู่ส่ง empty string เพื่อ clear filter
 *
 * @param props - props ของ filter
 * @param props.value - URL filter string ปัจจุบัน
 * @param props.onChange - callback เปลี่ยนค่า filter
 * @param props.fieldKey - field name ที่ใช้ใน filter (default "pr_date")
 * @param props.className - className เพิ่มเติม
 * @returns JSX element ของ date range picker
 * @example
 * ```tsx
 * <FilterDate value={extraFilter} onChange={setExtraFilter} fieldKey="po_date" />
 * ```
 */
export function FilterDate({
  value,
  onChange,
  fieldKey = "pr_date",
  className,
}: FilterDateProps) {
  const rangeValue: DateRange | undefined = (() => {
    if (!value) return undefined;
    const match = new RegExp(String.raw`${fieldKey}\|date_range:(.+)`).exec(
      value,
    );
    if (!match) return undefined;
    const [from, to] = match[1].split(",");
    if (!from || !to) return undefined;
    return { from, to };
  })();

  // Use local time methods to avoid UTC shift (e.g. UTC+7 clicking 27th → UTC gives 26th)
  const toDateOnly = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleRangeChange = (range: DateRange) => {
    if (!range.from && !range.to) {
      onChange("");
      return;
    }
    if (range.from && range.to) {
      onChange(
        `${fieldKey}|date_range:${toDateOnly(range.from)},${toDateOnly(range.to)}`,
      );
    }
  };

  return (
    <DateRangePicker
      value={rangeValue}
      onValueChange={handleRangeChange}
      size="sm"
      className={cn("w-full", className)}
      numberOfMonths={1}
    />
  );
}
