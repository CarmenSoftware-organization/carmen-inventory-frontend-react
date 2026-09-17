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
  CnGrnRow,
  DiscountCell,
  LineSubtotalText,
  LocationCell,
  NetCell,
  PriceCell,
  ProductCell,
  QtyCell,
  TaxCell,
  TotalCell,
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

  const columns = useMemo<ColumnDef<CnItemField>[]>(() => {
    const rightMeta = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    } as const;

    // แถวหลัก = ฝั่งคืน (ช่องกรอกทั้งหมด) · กางออกเพื่อดูยอดตาม GRN ที่รับมาจริง
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
          <CnGrnRow
            form={form}
            index={Math.max(
              itemFields.findIndex((field) => field.id === item.id),
              0,
            )}
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
        accessorKey: "location_id",
        header: tfl("location"),
        size: CN_COL.location,
        cell: ({ row }) => (
          <LocationCell control={form.control} index={row.index} />
        ),
      },
      {
        accessorKey: "item_id",
        header: tfl("product"),
        size: CN_COL.product,
        cell: ({ row }) => (
          <ProductCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "return_qty",
        header: tfl("received"),
        size: CN_COL.qty,
        meta: rightMeta,
        // amount_discount ตั้งยอดที่คอลัมน์ Net ตรง ๆ จำนวนคืนไม่มีผลต่อยอด
        // จึงไม่ต้องมีช่องล็อกไว้ให้รก
        cell: ({ row }) =>
          type === "amount_discount" ? null : (
            <QtyCell
              form={form}
              index={row.index}
              disabled={disabled}
              locked={false}
            />
          ),
      },
      {
        id: "price",
        header: tfl("price"),
        size: CN_COL.price,
        meta: rightMeta,
        // ราคาต่อหน่วยเท่าฝั่งรับเสมอ — คืนของชิ้นเดิมในราคาเดิม
        cell: ({ row }) => (
          <PriceCell control={form.control} index={row.index} />
        ),
      },
      {
        id: "sub_total",
        header: tfl("subtotal"),
        size: CN_COL.sub,
        meta: rightMeta,
        cell: ({ row }) => (
          <LineSubtotalText form={form} index={row.index} type={type} />
        ),
      },
      {
        id: "discount",
        header: tfl("discount"),
        size: CN_COL.discount,
        meta: rightMeta,
        cell: ({ row }) => (
          <DiscountCell form={form} index={row.index} type={type} />
        ),
      },
      {
        id: "net",
        header: t("netOrCnAmount"),
        size: CN_COL.net,
        meta: rightMeta,
        cell: ({ row }) => (
          <NetCell
            form={form}
            index={row.index}
            type={type}
            disabled={disabled}
          />
        ),
      },
      {
        id: "tax",
        header: tfl("tax"),
        size: CN_COL.tax,
        meta: rightMeta,
        cell: ({ row }) => (
          <TaxCell
            form={form}
            index={row.index}
            type={type}
            disabled={disabled}
          />
        ),
      },
      {
        id: "total",
        header: tfl("total"),
        size: CN_COL.amount,
        meta: rightMeta,
        cell: ({ row }) => (
          <TotalCell control={form.control} index={row.index} />
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
        cellClassName: cn(
          "py-2.5",
          !disabled && "min-h-11",
          col.meta?.cellClassName,
        ),
      },
    }));
  }, [form, disabled, type, itemFields, t, tfl, onDelete]);

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
