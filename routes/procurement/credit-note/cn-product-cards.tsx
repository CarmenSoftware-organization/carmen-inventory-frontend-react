import { memo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { Box, BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import EmptyComponent from "@/components/empty-component";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import type { GrnProductItem } from "@/types/goods-receive-note";
import { cn } from "@/lib/utils";
import type { CnFormValues } from "./cn-form-schema";
import { CN_ITEM } from "./cn-form-schema";
import { CnItemRow } from "./cn-item-row";

/**
 * เซลล์เลือก product ใน header ของ CN item card — LookupGrnProduct (scope ด้วย grnId)
 * เปลี่ยน product → เคลียร์ location ของ item นี้ (flat: 1 card = 1 product + 1 location)
 */
const CnProductCell = memo(function CnProductCell({
  control,
  form,
  grnId,
  index,
  disabled,
  defaultOpen,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  grnId: string | undefined;
  index: number;
  disabled: boolean;
  defaultOpen?: boolean;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  return (
    <div className="w-full max-w-105 space-y-2">
      <FieldLabel required className="text-xs">
        <Box className="text-muted-foreground size-3 shrink-0" />
        {tfl("product")}
      </FieldLabel>
      <Controller
        control={control}
        name={`items.${index}.item_id`}
        render={({ field, fieldState }) => (
          <LookupGrnProduct
            grnId={grnId}
            value={field.value ?? ""}
            onValueChange={(value, product: GrnProductItem | undefined) => {
              field.onChange(value);
              form.setValue(
                `items.${index}.item_name`,
                product?.product_name ?? "",
                { shouldDirty: true },
              );
              // เปลี่ยน product → เคลียร์ location เดิม
              form.setValue(`items.${index}.location_id`, null, {
                shouldDirty: true,
              });
              form.setValue(`items.${index}.location_name`, "", {
                shouldDirty: true,
              });
            }}
            disabled={disabled}
            defaultOpen={defaultOpen}
            className="w-full text-xs"
            error={fieldState.error?.message}
          />
        )}
      />
    </div>
  );
});

interface CnProductCardsProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
}

/**
 * รายการสินค้าของ CN — flat: แต่ละ item = 1 card (product + location + expandable
 * quantity/pricing/details). ต่างจาก GRN ที่ group by product เพราะ CN model เป็น
 * flat (credit_note_detail แต่ละ detail = 1 product + 1 location)
 */
export function CnProductCards({ form, disabled }: CnProductCardsProps) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const grnId = useWatch({ control: form.control, name: "grn_id" }) || undefined;
  const canAddItem = !disabled && !!grnId;
  // key ของ item ที่เพิ่งเพิ่ม → เปิด product lookup อัตโนมัติ (auto-focus)
  const [autoOpenProductKey, setAutoOpenProductKey] = useState<string | null>(
    null,
  );

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    const key = crypto.randomUUID();
    const currencyCode = form.getValues("currency_code") ?? "";
    prependItem({
      ...CN_ITEM,
      _group_key: key,
      currency_code: currencyCode,
    });
    setAutoOpenProductKey(key); // auto-focus product lookup ของ item ใหม่
  };

  const addAction = !disabled && (
    <Button
      type="button"
      size="xs"
      onClick={handleAddItem}
      disabled={!canAddItem}
    >
      <Plus aria-hidden="true" /> {t("addItem")}
    </Button>
  );

  const itemsError = form.formState.errors.items?.message;

  return (
    <div className="space-y-2 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {tfl("items")}
        </h2>
        {addAction}
      </div>

      {itemFields.length === 0 && (
        <EmptyComponent
          icon={BoxIcon}
          title={t("noItems")}
          description={t("noItemsDesc")}
          content={addAction}
        />
      )}

      {itemsError && (
        <p className="text-destructive text-xs" role="alert">
          {itemsError}
        </p>
      )}

      {itemFields.length > 0 && (
        <div className="space-y-3">
          {itemFields.map((item, idx) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border"
            >
              {/* Product header — flat, bare number */}
              <div className="flex items-center gap-2.5 border-b px-4 py-3">
                <span className="text-muted-foreground w-4 shrink-0 text-xs tabular-nums">
                  {idx + 1}
                </span>
                {!disabled ? (
                  <CnProductCell
                    control={form.control}
                    form={form}
                    grnId={grnId}
                    index={idx}
                    disabled={disabled}
                    defaultOpen={item._group_key === autoOpenProductKey}
                  />
                ) : (
                  (() => {
                    const productErr =
                      form.formState.errors.items?.[idx]?.item_id?.message;
                    return (
                      <div className="flex items-center gap-1">
                        <Box className="text-muted-foreground size-3 shrink-0" />
                        <span
                          className={cn(
                            "truncate text-sm font-semibold",
                            productErr && "text-destructive",
                          )}
                        >
                          {item.item_name ||
                            (productErr ? productErr : tfl("product"))}
                        </span>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Location + expandable editor */}
              <CnItemRow
                index={idx}
                form={form}
                disabled={disabled}
                showDelete={!disabled}
                onDelete={() => removeItem(idx)}
                groupIndices={[idx]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
