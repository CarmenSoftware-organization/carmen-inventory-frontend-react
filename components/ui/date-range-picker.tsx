
import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  readonly value?: DateRange;
  readonly onValueChange?: (value: DateRange) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly numberOfMonths?: number;
  readonly size?: "xs" | "sm" | "default";
}

/**
 * ปุ่มเลือกช่วงวันที่ (from/to) ผ่าน Popover + Calendar mode="range"
 *
 * value เก็บเป็น DateRange { from, to } (ISO strings) เพื่อ sync กับ
 * react-hook-form/URL ได้ง่าย ใช้ useProfile() เพื่อฟอร์แมตวันที่ตาม
 * ตั้งค่าของผู้ใช้ Popover เป็น modal และบล็อก pointer-down-outside
 * เพื่อให้ผู้ใช้เลือก range ครบก่อนปิด อัตโนมัติปิดเมื่อเลือกครบทั้ง from + to
 *
 * @param props - value, onValueChange, disabled, placeholder, numberOfMonths, size
 * @returns JSX element ของ date range picker
 * @example
 * ```tsx
 * <DateRangePicker
 *   value={range}
 *   onValueChange={setRange}
 *   numberOfMonths={2}
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onValueChange,
  disabled,
  placeholder = "Pick a date range",
  className,
  numberOfMonths = 2,
  size = "sm",
}: DateRangePickerProps) {
  const { dateFormat } = useProfile();
  const [open, setOpen] = useState(false);

  const selected =
    value?.from || value?.to
      ? {
          from: value.from ? new Date(value.from) : undefined,
          to: value.to ? new Date(value.to) : undefined,
        }
      : undefined;

  let displayValue: string | null = null;
  if (value?.from && value.to) {
    displayValue = `${formatDate(value.from, dateFormat)} - ${formatDate(value.to, dateFormat)}`;
  } else if (value?.from) {
    displayValue = formatDate(value.from, dateFormat);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            size={size}
            className={cn(
              "justify-start font-normal",
              displayValue && !disabled && "pr-7",
              !displayValue && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue ?? <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        {displayValue && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
            onClick={() => onValueChange?.({ from: "", to: "" })}
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            if (!range) return;
            const next: DateRange = {
              from: range.from?.toISOString() ?? "",
              to: range.to?.toISOString() ?? "",
            };
            onValueChange?.(next);
            if (range.from && range.to) {
              setOpen(false);
            }
          }}
          defaultMonth={selected?.from}
          numberOfMonths={numberOfMonths}
        />
      </PopoverContent>
    </Popover>
  );
}
