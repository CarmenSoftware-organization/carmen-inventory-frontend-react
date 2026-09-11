import { memo } from "react";
import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import type { PoFormValues } from "../po-form-schema";

export const TaxProfileCell = memo(function TaxProfileCell({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  if (disabled || readOnly) {
    const taxRate = form.getValues(`items.${index}.tax_rate`) ?? 0;
    return <span className="text-xs tabular-nums">{`${taxRate}%`}</span>;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.tax_profile_id`}
      render={({ field, fieldState }) => (
        <LookupTaxProfile
          value={field.value ?? ""}
          onValueChange={(value, rate) => {
            field.onChange(value || null);
            form.setValue(`items.${index}.tax_rate`, rate);
          }}
          disabled={disabled}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});
