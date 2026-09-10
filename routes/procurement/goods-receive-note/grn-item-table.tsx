import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  useFieldArray,
  useFormState,
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
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { GrnPoSelectDialog } from "./grn-po-select-dialog";
import type { GrnFormValues } from "./grn-form-schema";
import { EMPTY_DETAIL } from "./grn-form-schema";
import EmptyComponent from "@/components/empty-component";
import type { PoForGrn, PoGrnDetail } from "@/types/purchase-order";
import { useGrnItemTable } from "./use-grn-item-table";
import { GrnItemComputedSync } from "./grn-item-cells";

export const mapPoDetailToItems = (
  d: PoGrnDetail,
  poId: string,
  poNo: string,
): GrnFormValues["items"][number][] => {
  if (!d.locations?.length) {
    return [
      {
        ...EMPTY_DETAIL,
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

  // PO หนึ่งบรรทัดที่กระจายหลายคลัง = GRN หลายบรรทัด บรรทัดละคลัง
  return d.locations.map((loc) => ({
    ...EMPTY_DETAIL,
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
    // ราคาต่อหน่วยมาจาก PO ใบเดียวกัน ทุกบรรทัดที่แตกมาจากรายการเดียวจึงเริ่มที่
    // ราคาเดียวกัน — แก้รายบรรทัดทีหลังได้ (ของที่รับจริงอาจต่อรองราคาใหม่)
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
 * setValue discount/tax แบบ shouldValidate) → columns recompute → product
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
  /** ทั้งใบแก้ไม่ได้ — โหมดอ่าน หรือกำลังบันทึกอยู่ (เกณฑ์เดียวกับ PO) */
  readonly disabled: boolean;
}

/**
 * รายการสินค้าของ GRN — **1 แถว = 1 บรรทัดของเอกสาร (สินค้า + คลัง)** ตารางเดียว
 * ไม่มีกลุ่มสินค้าให้กาง (ทรงเดียวกับ PO หลังเลิก group location)
 *
 * ฟอร์มเก็บ `items` เป็น array แบนอยู่แล้ว การจับกลุ่มเมื่อก่อนเกิดตอน render
 * เท่านั้น — เอาออกแล้ว index ของแถวจึงตรงกับ index ในฟอร์มพอดี
 */
export function GrnItemTable({ form, disabled }: GrnItemTableProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const docType = useWatch({ control: form.control, name: "doc_type" });
  const isManual = docType === "manual";
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  // แถว (row id) ที่ต้องเปิดตัวเลือกสินค้า/โฟกัสราคา/เปิดตัวเลือกคลังอยู่ตอนนี้
  const [autoOpenProductId, setAutoOpenProductId] = useState<string | null>(
    null,
  );
  const [autoFocusPriceId, setAutoFocusPriceId] = useState<string | null>(null);
  const [openLocationId, setOpenLocationId] = useState<string | null>(null);

  // สลับโหมดดู↔แก้ = เริ่มกรอกรอบใหม่ ล้างสถานะนำทางทั้งชุด — ตารางไม่ได้ unmount
  // ตอนสลับโหมด ของค้างจากรอบก่อน (เช่นเลือกสินค้าไว้แล้วกด Cancel) จะกลับมาเด้ง
  // lookup หรือดูดเคอร์เซอร์ทันทีที่กด Edit ทั้งที่ผู้ใช้ยังไม่ได้แตะอะไร
  useEffect(() => {
    setAutoOpenProductId(null);
    setOpenLocationId(null);
    setAutoFocusPriceId(null);
  }, [disabled]);

  const {
    fields: itemFields,
    prepend: prependItem,
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

  /**
   * เลือกสินค้าเสร็จ → พาไปช่องถัดไปที่ต้องกรอกจริง
   *
   * Radix คืน focus ให้ปุ่มที่เพิ่งกดเป็นค่า default ซึ่งกลายเป็นทางตัน: ผู้ใช้พิมพ์
   * ต่อทันทีแล้วตัวเลขหายไปเฉย ๆ เพราะ focus ยังค้างที่ปุ่มเลือกสินค้า
   *
   * เส้นทางคือ **สินค้า → ราคา → คลัง → จำนวน** ครบทั้งแถวในบรรทัดเดียว
   *
   * callback ทุกตัวที่ส่งเข้า useGrnItemTable ห่อ useCallback ไว้ เพราะมันเป็น dep
   * ของ columns useMemo — ปล่อยให้เป็นฟังก์ชันใหม่ทุก render เท่ากับ columns
   * recompute ทุก render แล้ว cell ที่มีช่องกรอกจะโดนสร้างใหม่จนโฟกัสหลุด
   */
  const handleProductPicked = useCallback((rowId: string) => {
    setAutoOpenProductId(null);
    setAutoFocusPriceId(rowId);
  }, []);

  /** กรอกราคาเสร็จ (Enter) → เปิดตัวเลือกคลังของแถวเดิมต่อ */
  const handlePriceCommitted = useCallback((rowId: string) => {
    setAutoFocusPriceId(null);
    setOpenLocationId(rowId);
  }, []);

  const handleLocationOpenChange = useCallback(
    (rowId: string, open: boolean) => setOpenLocationId(open ? rowId : null),
    [],
  );

  const handleDeleteItem = useCallback(
    (index: number) => setDeleteIndex(index),
    [],
  );

  const table = useGrnItemTable({
    form,
    itemFields,
    disabled,
    isPo: !isManual,
    autoOpenProductId,
    autoFocusPriceId,
    openLocationId,
    onLocationOpenChange: handleLocationOpenChange,
    onProductPicked: handleProductPicked,
    onPriceCommitted: handlePriceCommitted,
    onDeleteItem: handleDeleteItem,
  });

  const handleAddItem = () => {
    prependItem({ ...EMPTY_DETAIL });
    // แถวใหม่อยู่บนสุดเสมอ — เปิดตัวเลือกสินค้าให้เลย ไม่ต้องกดซ้ำ
    setAutoOpenProductId(null);
    setAutoFocusPriceId(null);
    setOpenLocationId(null);
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

  const deleteTarget =
    deleteIndex == null ? undefined : itemFields[deleteIndex]?.product_name;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {addAction}
      </div>

      <ItemsArrayError control={form.control} />

      {/* compute sync — 1 ตัวต่อแถว เขียน derived discount/tax/net/total กลับ form */}
      {itemFields.map((item, i) => (
        <GrnItemComputedSync key={item.id} form={form} index={i} />
      ))}

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        tableLayout={{
          // เซลล์มีช่องกรอก — clamp สองบรรทัดทำ layout ของ control เพี้ยน
          rowClamp: false,
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
        <DataGridContainer scroll>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
        title={t("deleteProduct")}
        description={deleteTarget || undefined}
        onConfirm={() => {
          if (deleteIndex !== null) removeItem(deleteIndex);
          setDeleteIndex(null);
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
