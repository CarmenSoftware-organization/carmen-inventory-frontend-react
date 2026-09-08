import { memo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { GrnFormValues } from "../grn-form-schema";
import type { GrnGroup } from "./types";

/** Product lookup (manual) — set product ให้ทุก index ในกลุ่ม */
const ManualProductCell = memo(function ManualProductCell({
  form,
  indices,
  disabled,
  defaultOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  indices: number[];
  disabled: boolean;
  defaultOpen?: boolean;
  onPicked?: () => void;
}) {
  "use no memo";
  const primaryIndex = indices[0];
  return (
    <Controller
      control={form.control}
      name={`items.${primaryIndex}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(
                `items.${primaryIndex}.product_name`,
                product.name,
                {
                  shouldDirty: true,
                },
              );
            }
            // sibling rows shouldDirty ด้วย — ไม่งั้น dirtyFields ไม่ครบตอนแก้ GRN เดิม
            for (const idx of indices) {
              if (idx === primaryIndex) continue;
              form.setValue(`items.${idx}.product_id`, value, {
                shouldDirty: true,
              });
              if (product) {
                form.setValue(`items.${idx}.product_name`, product.name, {
                  shouldDirty: true,
                });
              }
            }
            if (value) onPicked?.();
          }}
          disabled={disabled}
          defaultOpen={defaultOpen}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

/** Product cell ของแถวกลุ่ม — manual: lookup; PO/linked: read-only name */
export function ProductGroupCell({
  form,
  group,
  disabled,
  autoOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  group: GrnGroup;
  disabled: boolean;
  autoOpen: boolean;
  onPicked: () => void;
}) {
  "use no memo";
  const primaryIdx = group.indices[0];
  const productName =
    useWatch({
      control: form.control,
      name: `items.${primaryIdx}.product_name`,
    }) ?? "";

  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${primaryIdx}.product_local_name`,
    }) ?? "";

  if (group.isManual && !disabled) {
    return (
      <ManualProductCell
        form={form}
        indices={group.indices}
        disabled={disabled}
        defaultOpen={autoOpen}
        onPicked={onPicked}
      />
    );
  }
  return <NameWithSubtext primary={productName} secondary={productLocalName} />;
}
