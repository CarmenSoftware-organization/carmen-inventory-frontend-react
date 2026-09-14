import { useCallback, useMemo, useRef, useState } from "react";
import { type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import type { GrnFormValues } from "./grn-form-schema";
import { grnItemCols } from "./grn-item-columns";
import {
  GrnAmountCell,
  GrnItemDiscountCell,
  GrnItemTaxCell,
  LocationCell,
  ProductCell,
  QtyUnitCell,
  ReceivedQtyCell,
  UnitPriceCell,
} from "./grn-item-cells";

/** แถวหนึ่งของตาราง = หนึ่งบรรทัดของเอกสาร (สินค้า + คลัง) */
export type GrnItemField = FieldArrayWithId<GrnFormValues, "items", "id">;

/**
 * ค่าสดของแถวจากฟอร์ม — `itemFields` ที่ table ถือไว้เป็น snapshot ตอน mount
 * เรียงจากค่านั้นแปลว่าเรียงตามชื่อที่ผู้ใช้เพิ่งเปลี่ยนไม่ได้ (ทรงเดียวกับ PR)
 */
function liveItem(form: UseFormReturn<GrnFormValues>, index: number) {
  return form.getValues(`items.${index}`);
}

interface UseGrnItemTableOptions {
  form: UseFormReturn<GrnFormValues>;
  itemFields: GrnItemField[];
  /**
   * ทั้งใบแก้ไม่ได้ (โหมดอ่าน หรือกำลังบันทึกอยู่) — เกณฑ์เดียวจบเหมือน PO:
   * แก้ไม่ได้เมื่อไร ทุกเซลล์เป็นตัวหนังสือ ไม่มีช่องกรอกสีเทาให้กดไม่ติด
   */
  disabled: boolean;
  isPo: boolean;
  /** แถวที่ต้องเปิดตัวเลือกสินค้าอยู่ตอนนี้ (เพิ่งเลือกคลังเสร็จ) */
  openProductId: string | null;
  onProductOpenChange: (rowId: string, open: boolean) => void;
  /** แถวที่ต้องโฟกัสช่องราคาอยู่ตอนนี้ (เพิ่งเลือกสินค้าเสร็จ) */
  autoFocusPriceId: string | null;
  /** เลือกคลังของแถวเสร็จแล้ว — ใช้พาไปเปิดตัวเลือกสินค้าต่อ */
  onLocationPicked: (rowId: string) => void;
  /** เลือกสินค้าของแถวเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onProductPicked: (rowId: string) => void;
  onDeleteItem: (index: number) => void;
}

export function useGrnItemTable({
  form,
  itemFields,
  disabled,
  isPo,
  openProductId,
  onProductOpenChange,
  autoFocusPriceId,
  onLocationPicked,
  onProductPicked,
  onDeleteItem,
}: UseGrnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.goodsReceiveNote");
  // เรียงฝั่ง client ล้วน — รายการทั้งหมดอยู่ในฟอร์มอยู่แล้ว ไม่มี request ให้ยิง
  const [sorting, setSorting] = useState<SortingState>([]);

  // แถวแก้ไม่ได้ = ทุกเซลล์เป็นตัวหนังสือ ไม่มี control ให้เผื่อที่
  const editable = !disabled;

  // กรอกราคาเสร็จ (Enter) → โฟกัสช่องจำนวนของ**แถวเดียวกัน** ต่อ — ปลายทางของสาย
  // กรอก คลัง → สินค้า → ราคา → จำนวน · ช่องราคากับช่องจำนวนอยู่คนละเซลล์
  // จึงต้องมี ref กลางรายแถวให้ทั้งคู่ถือร่วมกัน
  const qtyRefs = useRef(
    new Map<string, React.RefObject<HTMLInputElement | null>>(),
  );
  const qtyRefFor = useCallback((rowId: string) => {
    const map = qtyRefs.current;
    if (!map.has(rowId)) map.set(rowId, { current: null });
    return map.get(rowId)!;
  }, []);

  const columns = useMemo<ColumnDef<GrnItemField>[]>(() => {
    const COL = grnItemCols(editable);

    const indexColumn: ColumnDef<GrnItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: COL.leading,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };

    const dataColumns: ColumnDef<GrnItemField>[] = [
      {
        id: "location",
        // ต้องมี accessor ถึงจะกดเรียงได้ (คอลัมน์ display ล้วนกดไม่ได้) — ค่าที่ใช้
        // เรียงจริงมาจาก sortingFn ข้างล่างซึ่งอ่านฟอร์มสด ๆ
        accessorFn: (item) => item.location_name,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("location")} />
        ),
        sortingFn: (a, b) =>
          (liveItem(form, a.index)?.location_name ?? "").localeCompare(
            liveItem(form, b.index)?.location_name ?? "",
          ),
        size: COL.location,
        cell: ({ row }) => (
          <LocationCell
            form={form}
            index={row.index}
            disabled={
              disabled ||
              (!!row.original.purchase_order_detail_id &&
                !!row.original.location_id)
            }
            isManual={!row.original.purchase_order_detail_id}
            onPicked={() => onLocationPicked(row.id)}
          />
        ),
      },
      {
        id: "product",
        accessorFn: (item) => item.product_name,
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("product")} />
        ),
        sortingFn: (a, b) =>
          (liveItem(form, a.index)?.product_name ?? "").localeCompare(
            liveItem(form, b.index)?.product_name ?? "",
          ),
        size: COL.product,
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            isManual={!row.original.purchase_order_detail_id}
            disabled={disabled}
            open={row.id === openProductId ? true : undefined}
            onOpenChange={(open) => onProductOpenChange(row.id, open)}
            onPicked={() => onProductPicked(row.id)}
          />
        ),
      },
      ...(isPo
        ? [
            {
              id: "order",
              header: tfl("order"),
              size: COL.order,
              meta: rightMeta,
              cell: ({ row }) => (
                <QtyUnitCell
                  form={form}
                  index={row.index}
                  qtyField="approved_qty"
                  unitField="approved_unit_id"
                  // จำนวนที่สั่งมาจาก PO เสมอ — เป็นตัวเลขให้เทียบ ไม่ใช่ช่องกรอก
                  disabled
                />
              ),
            } as ColumnDef<GrnItemField>,
          ]
        : []),
      {
        id: "received",
        header: tfl("received"),
        size: COL.received,
        meta: rightMeta,
        cell: ({ row }) => (
          <ReceivedQtyCell
            form={form}
            index={row.index}
            disabled={disabled}
            inputRef={qtyRefFor(row.id)}
          />
        ),
      },
      {
        id: "foc",
        header: tfl("foc"),
        size: COL.foc,
        meta: rightMeta,
        cell: ({ row }) => (
          <QtyUnitCell
            form={form}
            index={row.index}
            qtyField="foc_qty"
            unitField="foc_unit_id"
            disabled={disabled}
          />
        ),
      },
      {
        id: "price",
        header: tfl("unitPrice"),
        size: COL.price,
        meta: rightMeta,
        cell: ({ row }) => (
          <UnitPriceCell
            form={form}
            index={row.index}
            disabled={disabled}
            autoFocus={row.id === autoFocusPriceId}
            onCommit={() => qtyRefFor(row.id).current?.focus()}
          />
        ),
      },
      {
        id: "subtotal",
        header: tfl("subtotal"),
        size: COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell form={form} index={row.index} field="subtotal" />
        ),
      },
      {
        id: "discount",
        header: tfl("discount"),
        size: COL.discount,
        meta: rightMeta,
        // โหมดดูเป็น "10% · 320.00" ซึ่งยาวกว่าคอลัมน์เมื่อหักระยะขอบออก
        // ปล่อยไว้จะตัดขึ้นบรรทัดใหม่แล้วแถวสูงกว่าแถวอื่น
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <GrnItemDiscountCell
              form={form}
              index={row.index}
              editable={editable}
            />
          </div>
        ),
      },
      {
        id: "net",
        header: tfl("net"),
        size: COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell form={form} index={row.index} field="netAmount" />
        ),
      },
      {
        id: "tax",
        header: tfl("tax"),
        size: COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <GrnItemTaxCell form={form} index={row.index} editable={editable} />
          </div>
        ),
      },
      {
        id: "amount",
        header: tfl("amount"),
        size: COL.amt,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            form={form}
            index={row.index}
            field="totalPrice"
            bold
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<GrnItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("deleteProductLine")}
                onClick={() => onDeleteItem(row.index)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("deleteProductLine")}</TooltipContent>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: COL.action,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        // h-11 ตายตัวทุกแถว — ปล่อยให้สูงตามเนื้อหาแล้วแถวที่ชื่อสินค้ากินสอง
        // บรรทัดจะสูงกว่าแถวอื่น ทั้งที่เป็นข้อมูลชนิดเดียวกัน
        cellClassName: cn("h-11 py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [
    form,
    disabled,
    editable,
    isPo,
    openProductId,
    autoFocusPriceId,
    onProductOpenChange,
    onLocationPicked,
    onProductPicked,
    onDeleteItem,
    qtyRefFor,
    tfl,
    t,
  ]);

  return useReactTable({
    data: itemFields,
    columns,
    // เรียงที่ table ไม่ใช่ที่ `data` — ทุกเซลล์ผูก `items.${row.index}` ไว้
    // สลับลำดับใน data เมื่อไร index จะไม่ตรงกับ field array อีก (เหมือน PR)
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });
}
