import { useMemo, useState } from "react";
import {
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CnFormValues } from "./cn-form-schema";
import type { CnCreditNoteType } from "./cn-item-compute";
import {
  CN_COL,
  CnReturnRow,
  GrnAmountCell,
  LocationCell,
  ProductCell,
  ReceivedCell,
} from "./cn-item-cells";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

interface UseCnItemTableOptions {
  form: UseFormReturn<CnFormValues>;
  itemFields: CnItemField[];
  disabled: boolean;
  onDelete: (index: number) => void;
}

export function useCnItemTable({
  form,
  itemFields,
  disabled,
  onDelete,
}: UseCnItemTableOptions) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const type = useWatch({
    control: form.control,
    name: "credit_note_type",
  }) as CnCreditNoteType;
  const isAmountDiscount = type === "amount_discount";

  const columns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    } as const;

    // กางเพื่อกรอกฝั่งคืน — แถวหลักเป็นยอดตาม GRN (ทรงเดียวกับ PO ที่กางดู location)
    const expandColumn: ColumnDef<CnItemField> = {
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
      size: CN_COL.leading,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
        // เริ่มที่คอลัมน์ Product — ข้าม expand + # ให้ตรงขอบเดียวกับแถวหลัก
        expandedColStart: 2,
        expandedContent: (item: CnItemField) => (
          <CnReturnRow
            form={form}
            index={Math.max(
              itemFields.findIndex((field) => field.id === item.id),
              0,
            )}
            type={type}
            disabled={disabled}
            showActionCol={!disabled}
          />
        ),
      },
    };

    const indexColumn: ColumnDef<CnItemField> = {
      id: "index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableResizing: false,
      size: CN_COL.leading,
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center text-muted-foreground",
      },
    };

    // แถวหลัก = ยอดของบรรทัดตาม GRN ที่รับมาจริง อ่านอย่างเดียวทั้งแถว
    // ฝั่งคืน (ช่องกรอกทั้งหมด) อยู่ในแถวที่กางออก ตรงคอลัมน์กันพอดี
    const dataColumns: ColumnDef<CnItemField>[] = [
      {
        accessorKey: "item_id",
        header: tfl("product"),
        size: CN_COL.product,
        cell: ({ row }) => (
          <ProductCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "location_id",
        header: tfl("location"),
        size: CN_COL.location,
        cell: ({ row }) => (
          <LocationCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "received_qty",
        header: tfl("received"),
        size: CN_COL.qty,
        meta: rightMeta,
        cell: ({ row }) => (
          <ReceivedCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "grn_price",
        header: tfl("price"),
        size: CN_COL.price,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_price"
          />
        ),
      },
      {
        id: "grn_sub_total",
        header: tfl("subtotal"),
        size: CN_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_sub_total"
          />
        ),
      },
      {
        id: "grn_discount",
        header: tfl("discount"),
        size: CN_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_discount_amount"
          />
        ),
      },
      {
        id: "grn_net",
        header: tfl("net"),
        size: CN_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_net_amount"
          />
        ),
      },
      {
        id: "grn_tax",
        header: tfl("tax"),
        size: CN_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_tax_amount"
          />
        ),
      },
      {
        id: "grn_total",
        header: tfl("amount"),
        size: CN_COL.amount,
        meta: rightMeta,
        cell: ({ row }) => (
          <GrnAmountCell
            control={form.control}
            index={row.index}
            field="_grn_total_amount"
          />
        ),
      },
    ];

    const actionColumn: ColumnDef<CnItemField> = {
      id: "action",
      header: () => "",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove"
          onClick={() => onDelete(row.index)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
      enableSorting: false,
      enableResizing: false,
      size: CN_COL.action,
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
        // h-11 ตายตัวทั้งแถวหลักและแถวคืน (ดู CnReturnRow) — ปล่อยให้สูงตาม
        // เนื้อหา แถวหลักจะ 39px เพราะชื่อสินค้ากินสองบรรทัด ส่วนแถวคืนบรรทัด
        // เดียวได้ 24px สองแถบเลยไม่เท่ากันทั้งที่เป็นรายการเดียวกัน · 44px ไม่ใช่
        // 40 เพราะช่องสินค้ากินสองบรรทัด (30px) ที่ 40px จะเหลือขอบบน-ล่างแค่ 5px
        // ดูอัดแน่นกว่าแถวคืนที่มีบรรทัดเดียว (เท่ากับ PO/GRN)
        cellClassName: cn("h-11 py-1 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [form, disabled, isAmountDiscount, type, itemFields, t, tfl, onDelete]);

  // กางทุกแถวไว้ตั้งแต่แรกเสมอ — ฝั่งคืนคือสาระของใบลดหนี้ ไม่ใช่รายละเอียดเสริม
  // (โหมดแก้ต้องกรอกทุกบรรทัดอยู่แล้ว โหมดอ่านก็ต้องเห็นว่าคืนอะไรไปเท่าไหร่)
  // พับเองได้ถ้าอยากกวาดตาดูเฉพาะยอดตาม GRN
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const table = useReactTable({
    data: itemFields,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => row.id,
  });

  return table;
}
