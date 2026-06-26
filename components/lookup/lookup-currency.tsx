
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
import { useCurrency } from "@/hooks/use-currency";
import type { Currency } from "@/types/currency";

interface LookupCurrencyProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (currency: Currency) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly disableTooltip?: boolean;
  readonly excludeIds?: Set<string>;
  readonly error?: string;
  readonly readOnly?: boolean;
}

export function LookupCurrency({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  disableTooltip,
  excludeIds,
  error,
  readOnly,
}: LookupCurrencyProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [selectOpen, setSelectOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data } = useCurrency({ perpage: 30 });
  const resolvedPlaceholder =
    placeholder ?? tl("select", { entity: tfl("currency") });

  const currencies =
    data?.data?.filter((c) => c.is_active && !excludeIds?.has(c.id)) ?? [];

  const selected = currencies.find((c) => c.id === value);

  const handleChange = (id: string) => {
    onValueChange(id);
    if (onItemChange) {
      const item = currencies.find((c) => c.id === id);
      if (item) onItemChange(item);
    }
  };

  const showErrorTooltip = !!error && !selectOpen;
  const showTooltip = !error && !disableTooltip && !selectOpen && !!selected;

  if (readOnly) {
    return (
      <span
        className={cn(
          "inline-flex min-h-8 items-center text-sm",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        {selected?.code ?? "—"}
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
              onValueChange={handleChange}
              disabled={disabled}
              onOpenChange={setSelectOpen}
            >
              <SelectTrigger
                aria-invalid={!!error}
                size={size}
                className={cn(
                  className ?? "w-full",
                  error && "border-destructive pr-7",
                )}
              >
                <SelectValue placeholder={resolvedPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem
                    key={currency.id}
                    value={currency.id}
                    className="text-xs"
                  >
                    {currency.code}
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
            className="bg-popover text-popover-foreground [&>svg]:fill-popover [&>svg]:text-border rounded-lg border px-3 py-2 shadow-md"
          >
            <p className="text-foreground/60 text-[0.6875rem] font-semibold">
              {selected?.code} ({selected?.symbol})
            </p>
            <p className="text-xs font-semibold">{selected?.name}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
