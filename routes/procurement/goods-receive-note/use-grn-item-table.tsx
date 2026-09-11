import { useCallback, useMemo, useRef } from "react";
import { type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
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
import type { GrnFormValues } from "./grn-form-schema";
import { grnItemCols } from "./grn-item-columns";
import {
  GrnAmountCell,
  GrnItemDiscountCell,
  GrnItemTaxCell,
  LocationCell,
  ProductCell,
  ProductUnitCell,
  QtyUnitCell,
  ReceivedQtyCell,
  UnitPriceCell,
} from "./grn-item-cells";

/** แถวหนึ่งของตาราง = หนึ่งบรรทัดของเอกสาร (สินค้า + คลัง) */
export type GrnItemField = FieldArrayWithId<GrnFormValues, "items", "id">;

interface UseGrnItemTableOptions {
  form: UseFormReturn<GrnFormValues>;
  itemFields: GrnItemField[];
  /**
   * ทั้งใบแก้ไม่ได้ (โหมดอ่าน หรือกำลังบันทึกอยู่) — เกณฑ์เดียวจบเหมือน PO:
   * แก้ไม่ได้เมื่อไร ทุกเซลล์เป็นตัวหนังสือ ไม่มีช่องกรอกสีเทาให้กดไม่ติด
   */
  disabled: boolean;
  isPo: boolean;
  /** แถวที่ต้องเปิดตัวเลือกสินค้าอยู่ตอนนี้ (เพิ่งกดเพิ่มรายการ) */
  autoOpenProductId: string | null;
  /** แถวที่ต้องโฟกัสช่องราคาอยู่ตอนนี้ (เพิ่งเลือกสินค้าเสร็จ) */
  autoFocusPriceId: string | null;
  /** แถวที่ต้องเปิดตัวเลือกคลังอยู่ตอนนี้ (คุมจากข้างนอก) */
  openLocationId: string | null;
  onLocationOpenChange: (rowId: string, open: boolean) => void;
  /** เลือกสินค้าของแถวเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onProductPicked: (rowId: string) => void;
  /** กรอกราคาของแถวเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onPriceCommitted: (rowId: string) => void;
  onDeleteItem: (index: number) => void;
}

export function useGrnItemTable({
  form,
  itemFields,
  disabled,
  isPo,
  autoOpenProductId,
  autoFocusPriceId,
  openLocationId,
  onLocationOpenChange,
  onProductPicked,
  onPriceCommitted,
  onDeleteItem,
}: UseGrnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.goodsReceiveNote");

  // แถวแก้ไม่ได้ = ทุกเซลล์เป็นตัวหนังสือ ไม่มี control ให้เผื่อที่
  const editable = !disabled;

  // เลือกคลังเสร็จ → โฟกัสช่องจำนวนของ**แถวเดียวกัน** ต่อ (Radix คืนโฟกัสให้ปุ่ม
  // ที่เพิ่งกดเป็นค่า default ซึ่งเป็นทางตัน — พิมพ์ต่อแล้วตัวเลขหายเฉย ๆ)
  // สองช่องนี้อยู่คนละเซลล์แล้ว จึงต้องมี ref กลางรายแถวให้ทั้งคู่ถือร่วมกัน
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
        header: tfl("location"),
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
            open={row.id === openLocationId ? true : undefined}
            onOpenChange={(open) => onLocationOpenChange(row.id, open)}
            nextFocusRef={qtyRefFor(row.id)}
          />
        ),
      },
      {
        id: "product",
        header: tfl("product"),
        size: COL.product,
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            isManual={!row.original.purchase_order_detail_id}
            disabled={disabled}
            autoOpen={row.id === autoOpenProductId}
            onPicked={() => onProductPicked(row.id)}
          />
        ),
      },
      {
        id: "unit",
        header: tfl("unit"),
        size: COL.unit,
        cell: ({ row }) => (
          <ProductUnitCell control={form.control} index={row.index} />
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
            onCommit={() => onPriceCommitted(row.id)}
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
    autoOpenProductId,
    autoFocusPriceId,
    openLocationId,
    onLocationOpenChange,
    onProductPicked,
    onPriceCommitted,
    onDeleteItem,
    qtyRefFor,
    tfl,
    t,
  ]);

  return useReactTable({
    data: itemFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
}
