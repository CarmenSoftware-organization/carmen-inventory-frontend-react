import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import type { GrnFormValues } from "../grn-form-schema";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";

export function LocationCell({
  form,
  index,
  disabled,
  autoOpen,
  open,
  onOpenChange,
  nextFocusRef,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  disabled: boolean;
  autoOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  nextFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  "use no memo";
  const [productId, locationName, locationCode] = useWatch({
    control: form.control,
    name: [
      `items.${index}.product_id`,
      `items.${index}.location_name`,
      `items.${index}.location_code`,
    ] as const,
  });

  if (disabled) {
    return <NameWithSubtext primary={locationName} secondary={locationCode} />;
  }

  return (
    <Controller
      control={form.control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupProductLocation
          productId={productId ?? ""}
          value={field.value ?? ""}
          onValueChange={(value) => {
            field.onChange(value);
            if (value) onOpenChange?.(false);
          }}
          onItemChange={(location) => {
            form.setValue(`items.${index}.location_name`, location.name);
            form.setValue(`items.${index}.location_code`, location.code);
            form.setValue(
              `items.${index}.location_type`,
              location.location_type,
            );
          }}
          defaultLabel={locationName || undefined}
          disabled={!productId}
          defaultOpen={autoOpen}
          open={open}
          onOpenChange={onOpenChange}
          nextFocusRef={nextFocusRef}
          className="h-8 w-full text-xs"
          modal
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
