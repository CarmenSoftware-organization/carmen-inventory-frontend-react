import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import { getDeleteDescription } from "@/lib/form-utils";
import type { CnFormValues } from "./cn-form-schema";
import { CN_ITEM } from "./cn-form-schema";
import { CnItemComputedSync, useCnItemTable } from "./use-cn-item-table";

interface Props {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
}

/**
 * รายการสินค้าของ CN — flat data grid (1 row = 1 product + location + qty/unit)
 */
export function CnItem({ form, disabled }: Props) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const grnId =
    useWatch({ control: form.control, name: "grn_id" }) || undefined;
  const canAddItem = !disabled && !!grnId;
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  // index ของ row ที่เพิ่งเพิ่ม → auto-open product lookup (prepend อยู่ index 0)
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    const currencyCode = form.getValues("currency_code") ?? "";
    prependItem({
      ...CN_ITEM,
      _group_key: crypto.randomUUID(),
      currency_code: currencyCode,
    });
    setAutoOpenIndex(0); // auto-focus product lookup ของ item ใหม่ (บนสุด)
  };

  const table = useCnItemTable({
    form,
    itemFields,
    disabled,
    grnId,
    autoOpenIndex,
    onDelete: setDeleteIndex,
  });

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
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-end">{addAction}</div>
      {itemsError && (
        <p className="text-destructive text-xs" role="alert">
          {itemsError}
        </p>
      )}

      {/* compute sync — 1 ต่อ item, รัน setValue net/tax/total แม้ตอน collapsed */}
      {itemFields.map((item, i) => (
        <CnItemComputedSync
          key={item.id}
          control={form.control}
          form={form}
          index={i}
        />
      ))}

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
            content={addAction}
          />
        }
      >
        <ScrollArea className="w-full">
          <DataGridContainer>
            <DataGridTable />
          </DataGridContainer>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={tfl("deleteLocation")}
        description={getDeleteDescription(deleteIndex, form, "item_name")}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeItem(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </div>
  );
}
