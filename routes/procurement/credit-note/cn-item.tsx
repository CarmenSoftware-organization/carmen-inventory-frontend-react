import { useMemo, useState } from "react";
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
import EmptyComponent from "@/components/empty-component";
import { getDeleteDescription } from "@/lib/form-utils";
import type { CnFormValues } from "./cn-form-schema";
import { CN_ITEM } from "./cn-form-schema";
import { CnItemComputedSync, useCnItemTable } from "./use-cn-item-table";
import { CnAddItemDialog, type CnGrnLine } from "./cn-add-item-dialog";

interface Props {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
}

/**
 * รายการสินค้าของ CN — flat data grid (1 row = 1 product + location + qty/unit).
 * เพิ่มรายการผ่าน dialog เลือกจาก GRN อ้างอิง (pre-fill price/tax/unit/qty)
 */
export function CnItem({ form, disabled }: Props) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const grnId =
    useWatch({ control: form.control, name: "grn_id" }) || undefined;
  const canAddItem = !disabled && !!grnId;
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  // product:location ที่มีอยู่แล้ว → ส่งให้ dialog disable กันเพิ่มซ้ำ
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const existingKeys = useMemo(
    () =>
      new Set(
        (watchedItems ?? []).map(
          (i) => `${i.item_id ?? ""}:${i.location_id ?? ""}`,
        ),
      ),
    [watchedItems],
  );

  const handleAddLines = (lines: CnGrnLine[]) => {
    if (lines.length === 0) return;
    const currencyCode = form.getValues("currency_code") ?? "";
    // prepend เรียงตามที่เลือก — reverse เพื่อให้ตัวแรกที่เลือกอยู่บนสุด
    prependItem(
      lines.map((line) => ({
        ...CN_ITEM,
        _group_key: crypto.randomUUID(),
        currency_code: currencyCode,
        item_id: line.product_id,
        item_name: line.product_name,
        item_local_name: line.product_local_name,
        location_id: line.location_id,
        location_name: line.location_name,
        location_code: line.location_code,
        unit_id: line.unit_id,
        unit_name: line.unit_name,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_rate: line.discount_rate,
        tax_profile_id: line.tax_profile_id,
        tax_profile_name: line.tax_profile_name,
        tax_rate: line.tax_rate,
      })),
    );
  };

  const table = useCnItemTable({
    form,
    itemFields,
    disabled,
    onDelete: setDeleteIndex,
  });

  const addAction = !disabled && (
    <Button
      type="button"
      size="xs"
      onClick={() => setAddOpen(true)}
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
        tableLayout={{ columnsResizable: true }}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
            content={addAction}
          />
        }
      >
        {/* columnsResizable → คอลัมน์กว้างตาม size (px) จริง; DataGridContainer เป็น
            native scroll (overflow-auto) — scroll แนวนอนแบบ PR (ไม่ห่อ Radix ScrollArea
            เลี่ยง nested scroll ที่สะดุด) */}
        <DataGridContainer className="[scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent]">
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <CnAddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        grnId={grnId}
        existingKeys={existingKeys}
        onAdd={handleAddLines}
      />

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
