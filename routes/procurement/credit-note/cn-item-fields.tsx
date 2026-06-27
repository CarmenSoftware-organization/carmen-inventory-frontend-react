"use no memo";

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
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import EmptyComponent from "@/components/empty-component";
import { getDeleteDescription } from "@/lib/form-utils";
import type { CnFormValues } from "./cn-form-schema";
import { CN_ITEM } from "./cn-form-schema";
import { useCnItemTable } from "./cn-item-table";
import { CnSheet } from "./cn-sheet";

interface CnItemFieldsProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
}

/**
 * ส่วนจัดการรายการสินค้าของฟอร์ม CN
 * รวม DataGrid, ปุ่มเพิ่ม item, DeleteDialog และ CnSheet สำหรับดู/แก้ไขรายละเอียด
 * ใช้ useFieldArray จัดการ items และ useCnItemTable สร้างคอลัมน์
 *
 * @param props - props ของ section
 * @param props.form - UseFormReturn ของ CnFormValues
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของตาราง items
 * @example
 * <CnItemFields form={form} disabled={isView} />
 */
export function CnItemFields({ form, disabled }: CnItemFieldsProps) {
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const grnId = useWatch({ control: form.control, name: "grn_id" });
  const canAddItem = !disabled && !!grnId;

  const handleAddItem = () => {
    appendItem({ ...CN_ITEM });
  };

  const { table } = useCnItemTable({
    form,
    itemFields,
    disabled,
    onDelete: setDeleteIndex,
    onShowDetail: setDetailIndex,
  });

  const itemsError = form.formState.errors.items?.message;

  return (
    <div className="space-y-2 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {tfl("items")}{" "}
          <span className="text-muted-foreground font-normal">
            ({itemFields.length})
          </span>
        </h2>
        {!disabled && (
          <Button
            type="button"
            size="xs"
            onClick={handleAddItem}
            disabled={!canAddItem}
          >
            <Plus aria-hidden="true" /> {t("addItem")}
          </Button>
        )}
      </div>

      {itemsError && (
        <p className="text-destructive text-xs" role="alert">
          {itemsError}
        </p>
      )}

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
            content={
              !disabled && (
                <Button
                  type="button"
                  size="xs"
                  onClick={handleAddItem}
                  disabled={!canAddItem}
                >
                  <Plus aria-hidden="true" /> {t("addItem")}
                </Button>
              )
            }
          />
        }
      >
        <DataGridContainer>
          <ScrollArea className="w-full pb-2">
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("removeItem")}
        description={getDeleteDescription(deleteIndex, form, "item_name")}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeItem(deleteIndex);
          setDeleteIndex(null);
        }}
      />

      {detailIndex !== null && (
        <CnSheet
          form={form}
          itemIndex={detailIndex}
          open
          onOpenChange={(o) => {
            if (!o) setDetailIndex(null);
          }}
          disabled={disabled}
        />
      )}
    </div>
  );
}
