import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { cn } from "@/lib/utils";
import { useAddLocationRegistry } from "./po-locations-add-context";
import type { PoFormValues } from "./po-form-schema";

interface Props {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

export function LocationsEditor({ form, index, disabled, readOnly }: Props) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.purchaseOrder");
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  // unit ของ item — ต่อท้าย qty ทุก location (เหมือน GRN "20 KG")
  const unitName =
    useWatch({
      control: form.control,
      name: `items.${index}.order_unit_name`,
    }) ?? "";

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: `items.${index}.locations`,
  });
  const watchedLocations = useWatch({
    control: form.control,
    name: `items.${index}.locations`,
  });

  const editable = !disabled && !readOnly;
  const [deleteLocIndex, setDeleteLocIndex] = useState<number | null>(null);

  // ลงทะเบียน prepend ให้ปุ่ม "+" ใน action column ของ product row เรียกใช้
  // (LocationsEditor เป็นเจ้าของ useFieldArray เดียว จึง sync ถูกต้อง)
  const addRegistry = useAddLocationRegistry();
  useEffect(() => {
    if (!addRegistry || !editable) return;
    addRegistry.set(index, () =>
      prepend({ id: "", order_qty: 0, received_qty: 0 }),
    );
    return () => {
      addRegistry.delete(index);
    };
  }, [addRegistry, editable, index, prepend]);

  return (
    <div>
      <table className="w-full table-fixed">
        <thead className="text-muted-foreground text-xs font-semibold">
          <tr>
            <th
              scope="col"
              className={cn(
                "px-3 py-1 text-left",
                editable ? "w-[53%]" : "w-[60%]",
              )}
            >
              {tfl("location")}
            </th>
            <th scope="col" className="w-[22%] px-3 py-1 text-right">
              {tfl("orderQty")}
            </th>
            <th scope="col" className="w-[22%] px-3 py-1 text-right">
              {tfl("receivedQty")}
            </th>
            {editable && <th scope="col" className="w-[7%] px-3 py-1" />}
          </tr>
        </thead>
        <tbody className="divide-border/60 divide-y">
          {fields.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="text-muted-foreground border-border/40 border-t py-3 text-center"
              >
                —
              </td>
            </tr>
          )}
          {fields.map((loc, locIndex) => {
            const locErrors =
              form.formState.errors.items?.[index]?.locations?.[locIndex];
            const locIdError = locErrors?.id?.message;
            const reqQtyError = locErrors?.order_qty?.message;
            return (
              <tr
                key={loc.id}
                className="hover:bg-muted/40 align-middle transition-colors"
              >
                <td className="px-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Controller
                      control={form.control}
                      name={`items.${index}.locations.${locIndex}.id`}
                      render={({ field, fieldState }) => (
                        <LookupProductLocation
                          productId={productId}
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!editable}
                          readOnly={!editable}
                          excludeIds={(watchedLocations ?? [])
                            .map((l, i) => (i === locIndex ? null : l?.id))
                            .filter((id): id is string => !!id)}
                          className="w-full text-xs"
                          error={fieldState.error?.message ?? locIdError}
                        />
                      )}
                    />
                  </div>
                </td>
                <td className="px-3">
                  {editable ? (
                    <LocationQtyInput
                      form={form}
                      itemIndex={index}
                      locIndex={locIndex}
                      disabled={!editable}
                      error={reqQtyError}
                      unitName={unitName}
                    />
                  ) : (
                    <InputSuffixPlain
                      className="block w-full text-right"
                      value={watchedLocations?.[locIndex]?.order_qty ?? 0}
                      suffix={unitName}
                    />
                  )}
                </td>
                <td className="px-3">
                  {editable ? (
                    <InputSuffixField className="w-full" disabled>
                      <InputSuffixInput
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        placeholder="0"
                        disabled
                        {...form.register(
                          `items.${index}.locations.${locIndex}.received_qty`,
                          { valueAsNumber: true },
                        )}
                      />
                      {unitName && (
                        <InputSuffixAddon>
                          <span className="text-muted-foreground px-2 text-xs">
                            {unitName}
                          </span>
                        </InputSuffixAddon>
                      )}
                    </InputSuffixField>
                  ) : (
                    <InputSuffixPlain
                      className="block w-full text-right"
                      value={watchedLocations?.[locIndex]?.received_qty ?? 0}
                      suffix={unitName}
                    />
                  )}
                </td>
                {editable && (
                  <td className="px-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      aria-label={t("removeLocation")}
                      onClick={() => setDeleteLocIndex(locIndex)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <DeleteDialog
        open={deleteLocIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteLocIndex(null);
        }}
        title={t("removeLocation")}
        description={t("removeLocationConfirm")}
        onConfirm={() => {
          if (deleteLocIndex !== null) remove(deleteLocIndex);
          setDeleteLocIndex(null);
        }}
      />
    </div>
  );
}

function LocationQtyInput({
  form,
  itemIndex,
  locIndex,
  disabled,
  error,
  unitName,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly disabled: boolean;
  readonly error?: string;
  readonly unitName: string;
}) {
  "use no memo";
  const name = `items.${itemIndex}.locations.${locIndex}.order_qty` as const;
  const value = useWatch({ control: form.control, name }) ?? 0;
  return (
    <InputSuffixField className="w-full" disabled={disabled} error={!!error}>
      <InputSuffixInput
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        placeholder="0"
        defaultValue={value}
        {...form.register(name)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          form.setValue(name, Number.isNaN(n) ? 0 : n, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
      {unitName && (
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">{unitName}</span>
        </InputSuffixAddon>
      )}
    </InputSuffixField>
  );
}
