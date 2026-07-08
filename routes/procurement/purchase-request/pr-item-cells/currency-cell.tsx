import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo, useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import type { Currency } from "@/types/currency";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const CurrencyCell = memo(function CurrencyCell({
  control,
  form,
  index,
  isDisabled,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isDisabled: boolean;
}) {
  "use no memo";
  const currencyId =
    useWatch({ control, name: `items.${index}.currency_id` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  const { data } = useCurrency({ perpage: -1 });
  const currencies = useMemo(() => data?.data ?? [], [data?.data]);
  const selected = useMemo(
    () => currencies.find((c) => c.id === currencyId),
    [currencies, currencyId],
  );

  if (isDisabled || isRowLocked) {
    return (
      <p className="text-xs font-semibold">
        {selected ? (
          selected.code
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    );
  }

  const handleSelect = (currency: Currency) => {
    // shouldValidate: ล้างกรอบแดง currency ทันทีที่เลือก
    form.setValue(`items.${index}.currency_id`, currency.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(`items.${index}.currency_code`, currency.code);
    form.setValue(
      `items.${index}.currency_decimal_places`,
      currency.decimal_places ?? 2,
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          variant="ghost"
          size="xs"
          aria-label="Currency"
          className="pr-1.5! font-semibold"
        >
          {selected?.code ?? "—"}
          <ChevronDownIcon className="size-3 opacity-60" />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-64 min-w-16 overflow-y-auto"
      >
        {currencies.map((currency) => (
          <DropdownMenuItem
            key={currency.id}
            onSelect={() => handleSelect(currency)}
            className="justify-center font-semibold tabular-nums"
          >
            {currency.code}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
