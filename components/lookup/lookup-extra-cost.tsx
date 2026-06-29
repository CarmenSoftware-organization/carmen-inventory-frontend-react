
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
import { useExtraCost } from "@/hooks/use-extra-cost";

interface LookupExtraCostProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

/**
 * Lookup Select สำหรับเลือกประเภทค่าใช้จ่ายเพิ่มเติม (Extra Cost)
 *
 * ดึงข้อมูลผ่าน `useExtraCost({ perpage: 30 })` filter เฉพาะ `is_active = true`
 * แสดงเป็น shadcn Select สำหรับกรอกค่าใช้จ่ายอื่น ๆ ใน GRN/PO
 *
 * @param value - id ของ extra cost ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX select element ของ extra cost lookup
 * @example
 * ```tsx
 * <Controller name="extra_cost_id" control={form.control} render={({ field }) => (
 *   <LookupExtraCost value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupExtraCost({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupExtraCostProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data } = useExtraCost({ perpage: 30 });
  const resolvedPlaceholder =
    placeholder ?? tl("select", { entity: tfl("extraCost") });
  const extraCosts = data?.data?.filter((c) => c.is_active) ?? [];
  const showErrorTooltip = !!error && !selectOpen;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip
        open={showErrorTooltip && tooltipOpen}
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
                {extraCosts.map((ec) => (
                  <SelectItem key={ec.id} value={ec.id} className="text-xs">
                    {ec.name}
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
      </Tooltip>
    </TooltipProvider>
  );
}
