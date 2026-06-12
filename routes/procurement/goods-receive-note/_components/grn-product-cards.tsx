"use no memo";

import { memo, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, MapPinPlus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { GrnPoSelectDialog } from "./grn-po-select-dialog";
import type { GrnFormValues } from "./grn-form-schema";
import { EMPTY_DETAIL } from "./grn-form-schema";
import EmptyComponent from "@/components/empty-component";
import { LookupProduct } from "@/components/lookup/lookup-product";
import type { PoForGrn, PoGrnDetail } from "@/types/purchase-order";
import { cn } from "@/lib/utils";
import { GrnItemRow } from "./grn-item-row";

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

const ManualProductCell = memo(function ManualProductCell({
  control,
  form,
  indices,
  disabled,
}: {
  control: Control<GrnFormValues>;
  form: UseFormReturn<GrnFormValues>;
  indices: number[];
  disabled: boolean;
}) {
  const primaryIndex = indices[0];
  return (
    <Controller
      control={control}
      name={`items.${primaryIndex}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(`items.${primaryIndex}.product_name`, product.name, {
                shouldDirty: true,
              });
            }
            // sibling rows ต้อง shouldDirty: true ด้วย — ไม่งั้น dirtyFields ไม่ครบ
            // ตอนแก้ GRN เดิม การเปลี่ยน product ของแถวรองจะไม่ถูกส่งไป backend
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
          }}
          disabled={disabled}
          className="w-full max-w-105 text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

const PoAddButton = memo(function PoAddButton({
  control,
  onOpen,
  hasItems,
}: {
  control: Control<GrnFormValues>;
  onOpen: () => void;
  hasItems: boolean;
}) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const vendorId = useWatch({ control, name: "vendor_id" }) ?? "";
  return (
    <Button type="button" size="xs" disabled={!vendorId} onClick={onOpen}>
      <Plus aria-hidden="true" /> {hasItems ? t("addMorePo") : t("addFromPo")}
    </Button>
  );
});

interface ProductGroup {
  key: string;
  productName: string;
  orderUnitName: string;
  isManual: boolean;
  indices: number[];
}

interface GrnProductCardsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
}

export function GrnProductCards({ form, disabled }: GrnProductCardsProps) {
  const t = useTranslations("procurement.goodsReceiveNote");
  const tfl = useTranslations("field");
  const docType = useWatch({ control: form.control, name: "doc_type" });
  const isManual = docType === "manual";
  const [deleteGroup, setDeleteGroup] = useState<ProductGroup | null>(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);

  const {
    fields: itemFields,
    prepend: prependItem,
    insert: insertItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

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

  const handleAddItem = () => {
    prependItem({ ...EMPTY_DETAIL, _group_key: crypto.randomUUID() });
  };

  const handleAddLocation = (
    groupKey: string,
    productId: string | null,
    productName: string,
  ) => {
    const groupIndices: number[] = [];
    itemFields.forEach((item, idx) => {
      if (item._group_key === groupKey) groupIndices.push(idx);
    });
    const insertAt =
      groupIndices.length > 0 ? groupIndices[groupIndices.length - 1] + 1 : 0;
    insertItem(insertAt, {
      ...EMPTY_DETAIL,
      _group_key: groupKey,
      product_id: productId,
      product_name: productName,
    });
  };

  // Group items by _group_key
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ProductGroup>();

    itemFields.forEach((item, index) => {
      const key = item._group_key || `fallback-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          productName: item.product_name || "",
          orderUnitName: "",
          isManual: !item.purchase_order_detail_id,
          indices: [],
        });
      }
      groups.get(key)!.indices.push(index);
    });

    return Array.from(groups.values());
  }, [itemFields]);

  const handleRemoveGroup = (indices: number[]) => {
    const sorted = [...indices].sort((a, b) => b - a);
    sorted.forEach((i) => removeItem(i));
  };

  const addAction = !disabled && (
    <div className="flex items-center gap-2">
      {isManual && (
        <Button type="button" size="xs" onClick={handleAddItem}>
          <Plus /> {t("addItem")}
        </Button>
      )}
      {!isManual && (
        <PoAddButton
          control={form.control}
          onOpen={() => setPoDialogOpen(true)}
          hasItems={itemFields.length > 0}
        />
      )}
    </div>
  );

  const itemsError = form.formState.errors.items?.message;

  return (
    <div className="space-y-2 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{tfl("items")}</h2>
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

      {groupedItems.length > 0 && (
        <div className="space-y-3">
          {groupedItems.map((group, groupIdx) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-lg border shadow-sm"
            >
              {/* Card header */}
              <div className="bg-muted/50 flex items-center justify-between gap-3 border-b px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded text-[0.625rem] font-semibold">
                    {groupIdx + 1}
                  </div>
                  {group.isManual && !disabled ? (
                    <ManualProductCell
                      control={form.control}
                      form={form}
                      indices={group.indices}
                      disabled={disabled}
                    />
                  ) : (
                    (() => {
                      const primaryIdx = group.indices[0];
                      const productErr =
                        form.formState.errors.items?.[primaryIdx]?.product_id
                          ?.message;
                      return (
                        <span
                          className={cn(
                            "truncate text-xs font-medium",
                            productErr && "text-destructive",
                          )}
                        >
                          {group.productName ||
                            (productErr ? productErr : tfl("product"))}
                        </span>
                      );
                    })()
                  )}
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="ml-1 shrink-0 tabular-nums"
                  >
                    {group.indices.length} {tfl("location")}
                  </Badge>
                </div>
                {!disabled && (
                  <div className="flex shrink-0 items-center gap-1">
                    {group.isManual && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          const idx = group.indices[0];
                          handleAddLocation(
                            group.key,
                            form.getValues(`items.${idx}.product_id`),
                            form.getValues(`items.${idx}.product_name`),
                          );
                        }}
                      >
                        <MapPinPlus aria-hidden="true" />
                        {t("addLocation")}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove"
                      onClick={() => setDeleteGroup(group)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Location rows */}
              <div className="divide-y">
                {group.indices.map((idx) => (
                  <GrnItemRow
                    key={itemFields[idx].id}
                    index={idx}
                    form={form}
                    disabled={disabled}
                    isManual={group.isManual}
                    showDelete={!disabled}
                    onDelete={() => removeItem(idx)}
                    locationName={itemFields[idx].location_name || ""}
                    locationCode={itemFields[idx].location_code || ""}
                    locationType={itemFields[idx].location_type || ""}
                    groupIndices={group.indices}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
