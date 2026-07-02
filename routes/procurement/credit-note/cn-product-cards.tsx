import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyComponent from "@/components/empty-component";
import type { CnFormValues } from "./cn-form-schema";
import { CN_ITEM } from "./cn-form-schema";
import { CnItemRow } from "./cn-item-row";

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
            <div key={item.id} className="overflow-hidden rounded-xl border">
              <CnItemRow
                index={idx}
                itemNumber={idx + 1}
                form={form}
                disabled={disabled}
                showDelete={!disabled}
                onDelete={() => removeItem(idx)}
                groupIndices={[idx]}
                autoOpenProduct={item._group_key === autoOpenProductKey}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
