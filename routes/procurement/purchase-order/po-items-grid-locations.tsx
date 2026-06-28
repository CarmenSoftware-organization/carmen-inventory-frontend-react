import { useState } from "react";
import { useTranslations } from "use-intl";
import {
  Controller,
  useFieldArray,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { FieldInput } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { cn } from "@/lib/utils";
import type { PoFormValues } from "./po-form-schema";

interface LocationsEditorProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

export function LocationsEditor({
  form,
  index,
  disabled,
  readOnly,
}: LocationsEditorProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.purchaseOrder");
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";

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

  return (
    <div className="space-y-2">
      {editable && (
        <div className="text-right">
          <Button
            type="button"
            size="xs"
            onClick={() => prepend({ id: "", order_qty: 0, received_qty: 0 })}
          >
            <Plus className="size-3" aria-hidden="true" />
            {t("addLocation")}
          </Button>
        </div>
      )}
      <div className="border-border/60 bg-card overflow-hidden rounded-lg border text-xs">
        <table className="w-full table-fixed">
          <thead className="bg-muted/40 text-muted-foreground font-bold tracking-wider uppercase">
            <tr>
              <th
                scope="col"
                className={cn(
                  "px-3 py-1.5 text-left",
                  // location หดลงเมื่อ edit เพื่อเปิดที่ให้ column trash (รวม 100% ทั้ง 2 โหมด)
                  editable ? "w-[53%]" : "w-[60%]",
                )}
              >
                {tfl("location")}
              </th>
              <th scope="col" className="w-[20%] px-3 py-1.5 text-right">
                {tfl("orderQty")}
              </th>
              <th scope="col" className="w-[20%] px-3 py-1.5 text-right">
                {tfl("receivedQty")}
              </th>
              {editable && <th scope="col" className="w-[7%] py-1.5" />}
            </tr>
          </thead>
          <tbody>
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
                  className="border-border/40 border-t align-middle"
                >
                  <td className="px-3 py-1.5">
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
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <LocationQtyInput
                        form={form}
                        itemIndex={index}
                        locIndex={locIndex}
                        disabled={!editable}
                        error={reqQtyError}
                      />
                    ) : (
                      <span className="block text-right text-xs tabular-nums">
                        {watchedLocations?.[locIndex]?.order_qty ?? 0}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    {editable ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        placeholder="0"
                        className="h-8 text-right"
                        disabled
                        {...form.register(
                          `items.${index}.locations.${locIndex}.received_qty`,
                          { valueAsNumber: true },
                        )}
                      />
                    ) : (
                      <span className="block text-right text-xs tabular-nums">
                        {watchedLocations?.[locIndex]?.received_qty ?? 0}
                      </span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-3 py-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-xs"
                        aria-label={t("removeLocation")}
                        onClick={() => setDeleteLocIndex(locIndex)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemIndex: number;
  readonly locIndex: number;
  readonly disabled: boolean;
  readonly error?: string;
}) {
  "use no memo";
  const name = `items.${itemIndex}.locations.${locIndex}.order_qty` as const;
  const value = useWatch({ control: form.control, name }) ?? 0;
  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={0}
      step="1"
      placeholder="0"
      className={cn("h-8 text-right", error && "pl-7")}
      disabled={disabled}
      error={error}
      errorIconAlign="left"
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
  );
}
