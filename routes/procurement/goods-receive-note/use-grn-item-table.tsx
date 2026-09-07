import { useMemo } from "react";
import { type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type Row,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, MapPinPlus, Trash2 } from "lucide-react";
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
  GroupAmountSum,
  GroupQtySum,
  GroupTotalCell,
  GroupUnitPrice,
  GrnGroupLocations,
  ProductGroupCell,
  ProductUnitCell,
  type GrnGroup,
} from "./grn-item-cells";

export type { GrnGroup };

interface UseGrnItemTableOptions {
  form: UseFormReturn<GrnFormValues>;
  groups: GrnGroup[];
  itemFields: { id: string }[];
  disabled: boolean;
  plainText: boolean;
  isPo: boolean;
  autoOpenProductKey: string | null;
  /** กลุ่มที่ต้องโฟกัสช่องราคาอยู่ตอนนี้ (เพิ่งเลือกสินค้าเสร็จ) */
  autoFocusPriceKey: string | null;
  autoOpenLocationKey: string | null;
  /** กลุ่มที่ location lookup ต้องเปิดอยู่ (คุมจากข้างนอก) */
  openLocationKey: string | null;
  onLocationOpenChange: (groupKey: string, open: boolean) => void;
  /** เลือกสินค้าของกลุ่มเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onProductPicked: (groupKey: string) => void;
  /** กรอกราคาของกลุ่มเสร็จแล้ว — ใช้พา focus ไปช่องถัดไป */
  onPriceCommitted: (groupKey: string) => void;
  onAddLocation: (group: GrnGroup) => void;
  onDeleteGroup: (group: GrnGroup) => void;
  onDeleteItem: (index: number) => void;
}

export function useGrnItemTable({
  form,
  groups,
  itemFields,
  disabled,
  plainText,
  isPo,
  autoOpenProductKey,
  autoFocusPriceKey,
  autoOpenLocationKey,
  openLocationKey,
  onLocationOpenChange,
  onProductPicked,
  onPriceCommitted,
  onAddLocation,
  onDeleteGroup,
  onDeleteItem,
}: UseGrnItemTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.goodsReceiveNote");

  const columns = useMemo<ColumnDef<GrnGroup>[]>(() => {
    const expandColumn: ColumnDef<GrnGroup> = {
      id: "expand",
      header: "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        // expanded content เริ่มที่ column Product (index 2 = expand, index, product)
        expandedColStart: 2,
        // ปุ่มเพิ่มคลังอยู่ใน gutter ซ้ายนี้ ไม่ใช่ในคอลัมน์ action ของแถวสินค้า —
        // มันสร้างของในตารางย่อย ปุ่มจึงควรอยู่กับตารางย่อย ไม่ใช่ไปปนกับปุ่มลบ
        // ทั้งรายการที่ทำงานคนละระดับกัน · align-top ของ gutter ทำให้ปุ่มอยู่
        // บรรทัดเดียวกับแถวคลังแถวแรกพอดี
        expandedLeading: (row: Row<GrnGroup>) =>
          row.original.isManual && !disabled ? (
            <div className="flex justify-end pt-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7.5"
                    aria-label={t("addLocation")}
                    onClick={() => onAddLocation(row.original)}
                  >
                    <MapPinPlus aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("addLocation")}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            // โหมดอ่าน/ใบอิง PO เพิ่มคลังเองไม่ได้ — ที่ว่างตรงนี้เลยใช้บอกว่า
            // ตารางข้าง ๆ คือคลัง ใช้สี/น้ำหนักชุดเดียวกับหัวคอลัมน์ของตาราง
            // (data-grid-table.tsx) มันจึงอ่านเป็นหัวคอลัมน์ ไม่ใช่ข้อมูลลอย
            <div className="text-muted-foreground flex justify-end pt-3 text-xs font-semibold">
              {tfl("location")}
            </div>
          ),
        expandedContent: (group: GrnGroup) => (
          <GrnGroupLocations
            group={group}
            form={form}
            itemFields={itemFields}
            disabled={disabled}
            plainText={plainText}
            isPo={isPo}
            autoOpenLocationKey={autoOpenLocationKey}
            openLocationKey={openLocationKey}
            onLocationOpenChange={onLocationOpenChange}
            onDeleteItem={onDeleteItem}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<GrnGroup> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: 40,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };
    // ยังไม่มีแถวก็ยังไม่มีช่องกรอกให้กว้าง — ใช้ความกว้างโหมดอ่านไปก่อน
    // พอมีรายการแรกค่อยขยาย · ตาราง location ด้านล่างใช้แค่ !disabled ได้
    // เพราะมันจะ render ก็ต่อเมื่อมีรายการอยู่แล้ว สองตารางจึงตรงกันเสมอ
    const { col: GRN_COL } = grnItemCols(
      isPo,
      !disabled && itemFields.length > 0,
    );
    const dataColumns: ColumnDef<GrnGroup>[] = [
      {
        id: "product",
        header: tfl("product"),
        size: GRN_COL.product,
        cell: ({ row }) => (
          <ProductGroupCell
            form={form}
            group={row.original}
            disabled={disabled}
            autoOpen={row.original.key === autoOpenProductKey}
            onPicked={() => onProductPicked(row.original.key)}
          />
        ),
      },
      {
        id: "unit",
        header: tfl("unit"),
        size: GRN_COL.unit,
        cell: ({ row }) => (
          <ProductUnitCell
            control={form.control}
            index={row.original.indices[0]}
          />
        ),
      },
      ...(isPo
        ? [
            {
              id: "order",
              header: tfl("order"),
              size: GRN_COL.order,
              meta: rightMeta,
              cell: ({ row }) => (
                <GroupQtySum
                  control={form.control}
                  indices={row.original.indices}
                  qtyField="approved_qty"
                  unitField="approved_unit_id"
                />
              ),
            } as ColumnDef<GrnGroup>,
          ]
        : []),
      {
        id: "received",
        header: tfl("received"),
        size: GRN_COL.received,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupQtySum
            control={form.control}
            indices={row.original.indices}
            qtyField="received_qty"
            unitField="received_unit_id"
          />
        ),
      },
      {
        id: "foc",
        header: tfl("foc"),
        size: GRN_COL.foc,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupQtySum
            control={form.control}
            indices={row.original.indices}
            qtyField="foc_qty"
            unitField="foc_unit_id"
          />
        ),
      },
      {
        id: "price",
        header: tfl("unitPrice"),
        size: GRN_COL.price,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupUnitPrice
            form={form}
            indices={row.original.indices}
            disabled={disabled}
            autoFocus={row.original.key === autoFocusPriceKey}
            onCommit={() => onPriceCommitted(row.original.key)}
          />
        ),
      },
      {
        id: "subtotal",
        header: tfl("subtotal"),
        size: GRN_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["net_amount", "discount_amount"]}
          />
        ),
      },
      {
        id: "discount",
        header: tfl("discount"),
        size: GRN_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["discount_amount"]}
          />
        ),
      },
      {
        id: "net",
        header: tfl("net"),
        size: GRN_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["net_amount"]}
          />
        ),
      },
      {
        id: "tax",
        header: tfl("tax"),
        size: GRN_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupAmountSum
            control={form.control}
            indices={row.original.indices}
            fields={["tax_amount"]}
          />
        ),
      },
      {
        id: "amount",
        header: tfl("amount"),
        size: GRN_COL.amt,
        meta: rightMeta,
        cell: ({ row }) => (
          <GroupTotalCell
            control={form.control}
            indices={row.original.indices}
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<GrnGroup> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("deleteProductLine")}
                onClick={() => onDeleteGroup(row.original)}
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
      size: GRN_COL.action,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    };

    const baseCols = [
      expandColumn,
      indexColumn,
      ...dataColumns,
      ...(disabled ? [] : [actionColumn]),
    ];

    return baseCols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        // h-11 ตายตัวทั้งแถวหลักและแถวย่อย — ปล่อยให้สูงตามเนื้อหา แถวหลักจะ 39px
        // เพราะชื่อสินค้ากินสองบรรทัด ส่วนแถวย่อยได้ 41px จากช่องกรอก สองแถบเลย
        // ไม่เท่ากันทั้งที่เป็นรายการเดียวกัน · 44px ไม่ใช่ 40 เพราะช่องสินค้ากิน
        // สองบรรทัด (30px) ที่ 40px จะเหลือขอบบน-ล่างแค่ 5px ดูอัดแน่นกว่าแถวย่อย
        // ที่มีบรรทัดเดียว (เหลือ 12px)
        cellClassName: cn("h-11 py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [
    form,
    itemFields,
    disabled,
    plainText,
    isPo,
    autoOpenProductKey,
    autoFocusPriceKey,
    autoOpenLocationKey,
    openLocationKey,
    onLocationOpenChange,
    onAddLocation,
    onProductPicked,
    onPriceCommitted,
    onDeleteGroup,
    onDeleteItem,
    tfl,
    t,
  ]);

  return useReactTable({
    data: groups,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.key,
  });
}
