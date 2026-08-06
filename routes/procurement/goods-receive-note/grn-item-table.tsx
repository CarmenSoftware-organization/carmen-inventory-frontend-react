import { memo, useEffect, useMemo, useState } from "react";
import {
  useFieldArray,
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { GrnPoSelectDialog } from "./grn-po-select-dialog";
import type { GrnFormValues } from "./grn-form-schema";
import { EMPTY_DETAIL } from "./grn-form-schema";
import EmptyComponent from "@/components/empty-component";
import type { PoForGrn, PoGrnDetail } from "@/types/purchase-order";
import { useGrnItemTable, type GrnGroup } from "./use-grn-item-table";
import { GrnItemComputedSync } from "./grn-location-row";

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
        // ยอดทั้งหมดของ GRN คิดจาก unit_price × received_qty (computeLineAmounts
        // แล้ว GrnItemComputedSync เขียน net/total กลับเข้าฟอร์ม) — ไม่หยิบราคา
        // จาก PO มาใส่ ทุกยอดในใบเลยเป็นศูนย์ทั้งที่ PO มีราคาอยู่
        //
        // net/total ปล่อยศูนย์ ให้ตัว sync เป็นคนคำนวณที่เดียว — seed ค่ามาจาก
        // PO ก็ถูกเขียนทับอยู่ดี มีแต่จะเห็นตัวเลขเก่าแวบหนึ่งตอนโหลด
        unit_price: d.price,
        net_amount: 0,
        total_price: 0,
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
    // ราคาต่อหน่วยเป็นของ product ไม่ใช่ของ location — PO ใบหนึ่งมีราคาเดียว
    // ทุก location ของรายการเดียวกันจึงใช้ราคาเดียวกัน ส่วน net/total ปล่อย
    // ศูนย์ไว้ได้เพราะ GrnItemComputedSync คำนวณทับตามจำนวนที่รับจริงของแต่ละ
    // location
    unit_price: d.price,
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
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={!vendorId}
      onClick={onOpen}
    >
      <Plus aria-hidden="true" /> {hasItems ? t("addMorePo") : t("addFromPo")}
    </Button>
  );
});

/**
 * error ระดับ array ของ items (เช่น "ต้องมีอย่างน้อย 1 รายการ") — subscribe errors
 * เองในคอมโพเนนต์ย่อยนี้ เพื่อ**ไม่ให้ GrnItemTable อ่าน form.formState.errors
 * โดยตรง** ซึ่งจะ subscribe แล้ว re-render ทั้งตารางทุกครั้งที่ validation รัน (เช่น
 * setValue discount/tax แบบ shouldValidate) → columns/groups recompute → product
 * lookup remount แล้วเด้ง focus. แยกออกมาแล้ว GrnItemTable นิ่ง ไม่ churn ตอนพิมพ์
 */
const ItemsArrayError = memo(function ItemsArrayError({
  control,
}: {
  control: Control<GrnFormValues>;
}) {
  "use no memo";
  const { errors } = useFormState({ control, name: "items" });
  const message = errors.items?.message;
  if (!message) return null;
  return (
    <p className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
});

interface GrnItemTableProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  /** view mode → qty ในแต่ละ location แสดงเป็น plain text */
  readonly plainText?: boolean;
  /** counter จากฟอร์ม — เพิ่มทุกครั้งที่ validation ไม่ผ่าน เพื่อ auto-expand group ที่ error */
  readonly revealErrorSignal?: number;
}

/**
 * รายการสินค้าของ GRN — DataGrid group-by-product (แบบ PO): 1 row = 1 product,
 * expand → location rows (แต่ละ location มี Quantity/Pricing/Details + Add Location)
 */
export function GrnItemTable({
  form,
  disabled,
  plainText = false,
  revealErrorSignal = 0,
}: GrnItemTableProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
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
  // กลุ่มที่ location lookup ต้องเปิดอยู่ตอนนี้ (คุมจากข้างนอก ไม่ใช่ defaultOpen
  // เพราะแถวถูก mount ไปแล้วตั้งแต่ตอนกดเพิ่มรายการ)
  const [openLocationKey, setOpenLocationKey] = useState<string | null>(null);

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

  /**
   * เลือกสินค้าเสร็จ → พาไปช่องถัดไปที่ต้องกรอกจริง
   *
   * Radix คืน focus ให้ปุ่มที่เพิ่งกดเป็นค่า default ซึ่งกลายเป็นทางตัน: ผู้ใช้พิมพ์
   * จำนวนต่อทันทีแล้วตัวเลขหายไปเฉย ๆ เพราะ focus ยังค้างที่ปุ่มเลือกสินค้า
   * ที่นี่จึงเปิด location ต่อให้เลย (เพิ่งกดได้เพราะ lookup ปลดล็อกตาม product_id)
   * แล้วพอเลือกคลังเสร็จ GrnLocationRow จะโฟกัสช่องจำนวนต่อเอง
   */
  const handleProductPicked = (groupKey: string) => {
    setAutoOpenProductKey(null);
    setOpenLocationKey(groupKey);
  };

  // กด Save/Submit แล้วติดที่ "ต้องมีอย่างน้อย 1 รายการ" — เติมแถวเปล่าให้เลย
  // ผู้ใช้จะได้เห็นว่าต้องกรอกช่องไหน แทนที่จะได้แค่ toast แล้วหน้าว่าง (กติกา
  // เดียวกับ PR/PO) · เฉพาะ GRN แบบ manual — แบบอิง PO รายการมาจาก PO ไม่ใช่กรอกเอง
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    if (itemFields.length === 0 && !disabled && isManual) handleAddItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ยิงครั้งเดียวต่อการกด submit
  }, [submitCount]);

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
    openLocationKey,
    onLocationOpenChange: (key, open) => setOpenLocationKey(open ? key : null),
    onProductPicked: handleProductPicked,
    onAddLocation: handleAddLocation,
    onDeleteGroup: setDeleteGroup,
    onDeleteItem: removeItem,
  });

  // validation ไม่ผ่าน: field location/received_qty/discount/tax อยู่ใน group expand
  // → auto-expand group ที่ติด error ให้ scrollToFirstInvalidField เจอ field (mirror PO)
  useEffect(() => {
    if (!revealErrorSignal) return;
    const itemErrors = form.formState.errors.items;
    if (!itemErrors) return;
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      if (group.indices.some((i) => itemErrors[i])) next[group.key] = true;
    }
    if (Object.keys(next).length === 0) return;
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      ...next,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealErrorSignal]);

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

  const addAction =
    !disabled &&
    (isManual ? (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleAddItem}
      >
        <Plus /> {t("addItem")}
      </Button>
    ) : (
      <PoAddButton
        control={form.control}
        onOpen={() => setPoDialogOpen(true)}
        hasItems={itemFields.length > 0}
      />
    ));

  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {groups.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              table.toggleAllRowsExpanded(!table.getIsAllRowsExpanded())
            }
          >
            {table.getIsAllRowsExpanded() ? (
              <>
                <ChevronsDownUp /> {tc("collapseAll")}
              </>
            ) : (
              <>
                <ChevronsUpDown /> {tc("expandAll")}
              </>
            )}
          </Button>
        )}
        {addAction}
      </div>

      <ItemsArrayError control={form.control} />

      {/* compute sync — 1 ต่อ location index, เขียน derived discount/tax/net/total กลับ form */}
      {itemFields.map((item, i) => (
        <GrnItemComputedSync key={item.id} form={form} index={i} />
      ))}

      <DataGrid
        table={table}
        recordCount={groups.length}
        tableLayout={{
          // table กว้างเกิน container → scroll แนวนอน (เหมือน PO): width =
          // getTotalSize(), column กว้างตาม size px ที่กำหนด
          columnsResizable: true,
        }}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
          />
        }
      >
        {/* DataGridContainer = native overflow-auto (เลี่ยง nested scroll ของ
            Radix ScrollArea ที่ทำ scroll แนวนอนสะดุด)
            · pb-3 = ที่ว่างให้ scrollbar แนวนอนยืน — บน macOS แถบนี้ลอยทับเนื้อหา
            โดยไม่กินที่ ไม่เว้นไว้มันจะไปบังตัวเลขแถวสุดท้าย */}
        <DataGridContainer scroll>
          <DataGridTable />
        </DataGridContainer>
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
