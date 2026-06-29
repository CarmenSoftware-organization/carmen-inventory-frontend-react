
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCnReason } from "@/hooks/use-cn-reason";

interface LookupCnReasonProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
  readonly readOnly?: boolean;
}

/**
 * Lookup Select สำหรับเลือกเหตุผลของ Credit Note (CN Reason)
 *
 * ดึงข้อมูลผ่าน `useCnReason({ perpage: 30 })` แสดงเป็น shadcn Select
 * พร้อม Tooltip แสดงชื่อเหตุผลเต็มเมื่อ hover (ช่วยกรณี cell แคบ)
 *
 * @param value - id ของ CN reason ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX select element ของ CN reason lookup
 * @example
 * ```tsx
 * <Controller name="cn_reason_id" control={form.control} render={({ field }) => (
 *   <LookupCnReason value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupCnReason({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
  readOnly,
}: LookupCnReasonProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data } = useCnReason({ perpage: 30 });
  const resolvedPlaceholder = placeholder ?? tl("select", { entity: tfl("cnReason") });
  const reasons = data?.data ?? [];
  const selectedLabel = reasons.find((r) => r.id === value)?.name;
  const showErrorTooltip = !!error && !selectOpen;
  const showTooltip = !error && !selectOpen && !!selectedLabel;

  if (readOnly) {
    return (
      <span
        className={cn(
          "inline-flex min-h-8 items-center text-sm",
          !selectedLabel && "text-muted-foreground",
          className,
        )}
      >
        {selectedLabel ?? "—"}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip
        open={(showErrorTooltip || showTooltip) && tooltipOpen}
        onOpenChange={setTooltipOpen}
      >
        <TooltipTrigger asChild>
          <div className="relative w-full">
            <Select
              value={value}
              onValueChange={onValueChange}
              disabled={disabled}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger
                aria-invalid={!!error}
                size={size}
                className={cn(
                  className ?? "h-8 w-full text-sm",
                  error && "border-destructive pr-7",
                )}
              >
                <SelectValue placeholder={resolvedPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id} className="text-xs">
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!!error && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-end pr-2">
                <CircleAlert
                  className="text-destructive size-4"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        {showErrorTooltip && (
          <TooltipContent
            side="top"
            align="end"
            className="bg-background text-destructive [&>svg]:fill-background [&>svg]:text-border border px-3 py-2 text-xs font-semibold"
          >
            {error}
          </TooltipContent>
        )}
        {showTooltip && (
          <TooltipContent
            side="top"
            className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md [&>svg]:fill-popover [&>svg]:text-border"
          >
            <p className="text-xs font-semibold">{selectedLabel}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
