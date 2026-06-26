
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
import { useCreditTerm } from "@/hooks/use-credit-term";
import type { CreditTerm } from "@/types/credit-term";

interface LookupCreditTermProps {
  readonly value: string;
  readonly onValueChange: (value: string, creditTerm?: CreditTerm) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

/**
 * Lookup Select สำหรับเลือกเงื่อนไขการชำระเงิน (Credit Term)
 *
 * ดึงข้อมูลผ่าน `useCreditTerm({ perpage: 30 })` และ filter เฉพาะ `is_active = true`
 * แสดงเป็น shadcn Select พร้อม Tooltip แสดงชื่อเต็มเมื่อ hover
 * onValueChange ส่งทั้ง id และ object `CreditTerm` เต็มสำหรับ side effects
 *
 * @param value - id ของ credit term ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่ง id และ object CreditTerm
 * @returns JSX select element ของ credit term lookup
 * @example
 * ```tsx
 * <Controller name="credit_term_id" control={form.control} render={({ field }) => (
 *   <LookupCreditTerm value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupCreditTerm({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  size = "sm",
  error,
}: LookupCreditTermProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data } = useCreditTerm({ perpage: 30 });
  const resolvedPlaceholder = placeholder ?? tl("select", { entity: tfl("creditTerm") });
  const creditTerms = data?.data?.filter((c) => c.is_active) ?? [];
  const selectedLabel = creditTerms.find((c) => c.id === value)?.name;
  const showErrorTooltip = !!error && !selectOpen;
  const showTooltip = !error && !selectOpen && !!selectedLabel;

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
              onValueChange={(val) => {
                const item = creditTerms.find((c) => c.id === val);
                onValueChange(val, item);
              }}
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
                {creditTerms.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id} className="text-xs">
                    {ct.name}
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
