import { memo, useMemo, useState } from "react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
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
import { GrnPoSelectDialog } from "./grn-po-select-dialog";
import type { GrnFormValues } from "./grn-form-schema";
import { EMPTY_DETAIL } from "./grn-form-schema";
import EmptyComponent from "@/components/empty-component";
import type { PoForGrn, PoGrnDetail } from "@/types/purchase-order";
import { useGrnItemTable, type GrnGroup } from "./use-grn-item-table";

export const mapPoDetailToItems = (
  d: PoGrnDetail,
  poId: string,
  poNo: string,
): GrnFormValues["items"][number][] => {
  if (!d.locations?.length) {
    return [
      {
        ...EMPTY_DETAIL,
        _group_key: d.id,
        purchase_order_id: poId,
        purchase_order_no: poNo,
        purchase_order_detail_id: d.id,
        product_id: d.product_id,
        product_name: d.product_name ?? "",
        received_qty: d.order_qty,
        received_unit_id: d.order_unit_id,
        received_base_qty: d.base_qty,
        received_base_unit_id: d.base_unit_id,
        approved_qty: d.order_qty,
        approved_unit_id: d.order_unit_id,
        net_amount: d.net_amount,
        total_price: d.net_amount,
      },
    ];
  }

  return d.locations.map((loc) => ({
    ...EMPTY_DETAIL,
    _group_key: d.id,
    purchase_order_id: poId,
    purchase_order_no: poNo,
    purchase_order_detail_id: d.id,
    product_id: d.product_id,
    product_name: d.product_name ?? "",
    location_id: loc.location_id,
    location_name: loc.location_name,
    location_code: loc.location_code ?? "",
    location_type: loc.location_type ?? "",
    received_qty: loc.remain_qty ?? loc.order_qty,
    received_unit_id: loc.request_unit_id || d.order_unit_id,
    received_base_qty: loc.request_base_qty ?? 0,
    received_base_unit_id: loc.request_base_unit_id || d.base_unit_id,
    approved_qty: loc.requested_qty ?? loc.order_qty,
    approved_unit_id: loc.request_unit_id || d.order_unit_id,
    foc_qty: loc.foc_qty ?? 0,
    net_amount: 0,
    total_price: 0,
  }));
};

const PoAddButton = memo(function PoAddButton({
  control,
  onOpen,
  hasItems,
}: {
  control: Control<GrnFormValues>;
  onOpen: () => void;
  hasItems: boolean;
}) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const vendorId = useWatch({ control, name: "vendor_id" }) ?? "";
  return (
    <Button type="button" size="xs" disabled={!vendorId} onClick={onOpen}>
      <Plus aria-hidden="true" /> {hasItems ? t("addMorePo") : t("addFromPo")}
    </Button>
  );
});

interface GrnProductCardsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  /** view mode → qty ในแต่ละ location แสดงเป็น plain text */
  readonly plainText?: boolean;
}

/**
 * รายการสินค้าของ GRN — DataGrid group-by-product (แบบ PO): 1 row = 1 product,
 * expand → location rows (แต่ละ location มี Quantity/Pricing/Details + Add Location)
 */
export function GrnProductCards({
  form,
  disabled,
  plainText = false,
}: GrnProductCardsProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tfl = useTranslations("field");
  const docType = useWatch({ control: form.control, name: "doc_type" });
  const isManual = docType === "manual";
  const [deleteGroup, setDeleteGroup] = useState<GrnGroup | null>(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [autoOpenProductKey, setAutoOpenProductKey] = useState<string | null>(
    null,
  );
  const [autoOpenLocationKey, setAutoOpenLocationKey] = useState<string | null>(
    null,
  );

  const {
    fields: itemFields,
    prepend: prependItem,
    insert: insertItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  // group items by _group_key → 1 group = 1 row
  const groups = useMemo<GrnGroup[]>(() => {
    const map = new Map<string, GrnGroup>();
    itemFields.forEach((item, index) => {
      const key = item._group_key || `fallback-${item.id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productName: item.product_name || "",
          isManual: !item.purchase_order_detail_id,
          indices: [],
        });
      }
      map.get(key)!.indices.push(index);
    });
    return Array.from(map.values());
  }, [itemFields]);

  const excludePoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of itemFields) {
      if (item.purchase_order_id) ids.add(item.purchase_order_id);
    }
    return ids;
  }, [itemFields]);

  const handleSelectPoList = (poList: PoForGrn[]) => {
    const items = poList.flatMap(
      (po) =>
        po.po_detail?.flatMap((d) => mapPoDetailToItems(d, po.id, po.po_no)) ??
        [],
    );
    if (items.length > 0) prependItem(items);
  };

  // เพิ่ม location ในกลุ่ม → insert row ต่อท้าย indices ของกลุ่ม (product เดิม, location ว่าง)
  const handleAddLocation = (group: GrnGroup) => {
    const idx = group.indices[0];
    const productId = form.getValues(`items.${idx}.product_id`);
    const productName = form.getValues(`items.${idx}.product_name`);
    const insertAt = group.indices[group.indices.length - 1] + 1;
    insertItem(insertAt, {
      ...EMPTY_DETAIL,
      _group_key: group.key,
      product_id: productId,
      product_name: productName,
    });
    setAutoOpenLocationKey(group.key);
    setAutoOpenProductKey(null);
  };

  const handleRemoveGroup = (indices: number[]) => {
    [...indices].sort((a, b) => b - a).forEach((i) => removeItem(i));
  };

  const table = useGrnItemTable({
    form,
    groups,
    itemFields,
    disabled,
    plainText,
    isPo: !isManual,
    autoOpenProductKey,
    autoOpenLocationKey,
    onAddLocation: handleAddLocation,
    onDeleteGroup: setDeleteGroup,
    onDeleteItem: removeItem,
  });

  const handleAddItem = () => {
    const key = crypto.randomUUID();
    prependItem({ ...EMPTY_DETAIL, _group_key: key });
    setAutoOpenProductKey(key);
    setAutoOpenLocationKey(null);
    // auto-expand product ใหม่ (บนสุด) ให้กรอก location ได้เลย
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      [key]: true,
    }));
  };

  const addAction = !disabled &&
    (isManual ? (
      <Button type="button" size="xs" onClick={handleAddItem}>
        <Plus /> {t("addItem")}
      </Button>
    ) : (
      <PoAddButton
        control={form.control}
        onOpen={() => setPoDialogOpen(true)}
        hasItems={itemFields.length > 0}
      />
    ));

  const itemsError = form.formState.errors.items?.message;

  return (
    <div className="space-y-2 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {tfl("items")}
        </h2>
        {addAction}
      </div>

      {itemsError && (
        <p className="text-destructive text-xs" role="alert">
          {itemsError}
        </p>
      )}

      <DataGrid
        table={table}
        recordCount={groups.length}
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
        open={!!deleteGroup}
        onOpenChange={(open) => !open && setDeleteGroup(null)}
        title={t("deleteProduct")}
        description={deleteGroup?.productName || undefined}
        onConfirm={() => {
          if (deleteGroup) {
            handleRemoveGroup(deleteGroup.indices);
            setDeleteGroup(null);
          }
        }}
      />

      {poDialogOpen && (
        <GrnPoSelectDialog
          open={poDialogOpen}
          onOpenChange={setPoDialogOpen}
          vendorId={form.getValues("vendor_id") ?? ""}
          excludeIds={excludePoIds}
          onSelect={handleSelectPoList}
        />
      )}
    </div>
  );
}
