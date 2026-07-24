
import { useMemo, useState } from "react";
import {
  Controller,
  type UseFormReturn,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import {
  ColumnDef,
  ExpandedState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronRight, Plus, Save, Send } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldInput, FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { round2 } from "@/lib/currency-utils";
import MoqTiersEditor from "./moq-tiers-sub-table";
import { PLProductGroupedView } from "@/routes/vendor-management/price-list/pl-product-grouped-view";
import type {
  MoqTierDto,
  PricelistExternalDto,
  PricelistExternalDetailDto,
  PricelistExternalTaxProfileOption,
} from "@/types/price-list-external";

// label ของ grouped view (mirror price list ภายใน) — portal เป็น public ใช้
// อังกฤษล้วนเหมือน header ส่วนอื่นของหน้านี้
const VIEW_LABELS: Record<string, string> = {
  product: "Product",
  moq: "MOQ",
  pwt: "Price without Tax",
  tax: "Tax",
  amount: "Amount",
};

/** จัดรูปเงิน 2 ตำแหน่ง + คั่นหลักพัน (รองรับ 00,000.00 ตามที่ column กว้างพอ) */
const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface PriceListExternalProductTableProps {
  form: UseFormReturn<PricelistExternalDto>;
  isViewMode?: boolean;
  onSave?: () => void;
  onSubmit?: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  // tax profile options จาก endpoint แยก (check-pricelist/{token}/tax-profiles)
  taxProfiles?: PricelistExternalTaxProfileOption[];
}

/** PWT (ก่อนภาษี) ของ row — computed สดจาก price (gross) ÷ (1 + rate) */
function RowPWT({
  form,
  index,
}: {
  form: UseFormReturn<PricelistExternalDto>;
  index: number;
}) {
  const price = useWatch({
    control: form.control,
    name: `tb_pricelist_detail.${index}.price`,
  });
  const rate = useWatch({
    control: form.control,
    name: `tb_pricelist_detail.${index}.tax_rate`,
  });
  const pwt = round2((Number(price) || 0) / (1 + (Number(rate) || 0) / 100));
  return (
    <span className="text-muted-foreground text-sm tabular-nums">
      {fmtMoney(pwt)}
    </span>
  );
}

/** Tax profile select ของ row — sync name + rate เมื่อเลือก */
function TaxProfileCell({
  form,
  index,
  taxProfiles,
}: {
  form: UseFormReturn<PricelistExternalDto>;
  index: number;
  taxProfiles: PricelistExternalTaxProfileOption[];
}) {
  "use no memo";
  return (
    <Controller
      control={form.control}
      name={`tb_pricelist_detail.${index}.tax_profile_id`}
      render={({ field }) => (
        <FieldSelect
          value={field.value}
          onValueChange={(id) => {
            field.onChange(id);
            const tp = taxProfiles.find((t) => t.id === id);
            form.setValue(
              `tb_pricelist_detail.${index}.tax_profile_name`,
              tp?.name ?? null,
            );
            form.setValue(
              `tb_pricelist_detail.${index}.tax_rate`,
              tp?.tax_rate ?? 0,
            );
          }}
          placeholder="—"
          className="h-9 w-full text-sm"
        >
          <SelectContent>
            {taxProfiles.map((tp) => (
              <SelectItem key={tp.id} value={tp.id}>
                {tp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </FieldSelect>
      )}
    />
  );
}

/** Tax amount ของ row = price(gross) − pwt = ส่วนต่างภาษี · computed สดจาก rate */
function RowTaxAmount({
  form,
  index,
}: {
  form: UseFormReturn<PricelistExternalDto>;
  index: number;
}) {
  const price = useWatch({
    control: form.control,
    name: `tb_pricelist_detail.${index}.price`,
  });
  const rate = useWatch({
    control: form.control,
    name: `tb_pricelist_detail.${index}.tax_rate`,
  });
  const p = Number(price) || 0;
  const r = Number(rate) || 0;
  return (
    <span className="text-foreground text-sm tabular-nums">
      {fmtMoney(round2(p - p / (1 + r / 100)))}
    </span>
  );
}

/**
 * ตารางแสดงและแก้ไขรายการสินค้าใน price list external
 * รองรับโหมด view (แสดงแบบ group ตาม product) และโหมด edit (แก้ไขราคา/MOQ/tax พร้อม expand ดู MOQ tiers)
 *
 * @param props - form instance, โหมด view, callback สำหรับ save/submit และสถานะ loading
 * @returns element ของตาราง price list
 * @example
 * ```tsx
 * <PriceListExternalProductTable
 *   form={form}
 *   isViewMode={false}
 *   onSave={handleSave}
 *   onSubmit={handleSubmit}
 *   isSaving={saving}
 *   isSubmitting={submitting}
 * />
 * ```
 */
export default function PriceListExternalProductTable({
  form,
  isViewMode = false,
  onSave,
  onSubmit,
  isSaving = false,
  isSubmitting = false,
  taxProfiles = [],
}: PriceListExternalProductTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});

  const { fields } = useFieldArray({
    control: form.control,
    name: "tb_pricelist_detail",
  });

  const hasPendingChanges = form.formState.isDirty;

  // Handler for updating MOQ tiers — ใช้ setValue ไม่ใช่ useFieldArray.update()
  // เพราะ update() จะ regenerate field id ของแถวนั้น ทำให้ columns (memo บน fields)
  // recreate แล้ว MoqTiersSubTable remount → input ใน tier เสีย focus แบบเดียวกับ
  // cells หลัก setValue เปลี่ยนเฉพาะค่า moq_tiers ไม่แตะ field id
  // เพิ่ม MOQ tier ให้ item ทีเดียวจบ + กาง sub-row ทันที (แทน flow เดิมที่ต้อง
  // กด expand ก่อนแล้วค่อยหาปุ่ม Add) — vendor คลิก "+ Tier" ครั้งเดียวได้ tier
  // ว่างพร้อมกรอกเลย
  const addTierToItem = (itemIndex: number, rowId: string) => {
    const current =
      (form.getValues(`tb_pricelist_detail.${itemIndex}.moq_tiers`) as
        | MoqTierDto[]
        | undefined) ?? [];
    form.setValue(
      `tb_pricelist_detail.${itemIndex}.moq_tiers`,
      [
        ...current,
        {
          id: `tier-new-${Date.now()}`,
          minimum_quantity: 0,
          price: 0,
          lead_time_days: 0,
        },
      ],
      { shouldDirty: true },
    );
    setExpandedRows((prev) => ({
      ...(prev === true ? {} : prev),
      [rowId]: true,
    }));
  };

  const columns = useMemo<ColumnDef<PricelistExternalDetailDto>[]>(
    () => [
      {
        // chevron พับ/กาง MOQ tiers — column แยกต่างหาก อยู่หน้าสุด
        id: "expand",
        header: () => null,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle pricing tiers"
            onClick={row.getToggleExpandedHandler()}
            className="text-muted-foreground"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                row.getIsExpanded() && "rotate-90",
              )}
            />
          </Button>
        ),
        size: 44,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      },
      {
        id: "no",
        header: "#",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.sequence_no}
          </span>
        ),
        size: 50,
        enableSorting: false,
      },
      {
        accessorKey: "product_name",
        id: "product_name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Product"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-medium">
              {row.original.product_name}
            </span>
            {row.original.product_code && (
              <span className="text-muted-foreground text-[0.6875rem]">
                {row.original.product_code}
              </span>
            )}
          </div>
        ),
        size: 240,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      },
      {
        accessorKey: "unit_name",
        id: "unit_name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.unit_name || "—"}
          </span>
        ),
        size: 80,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      },
      {
        accessorKey: "moq_qty",
        id: "moq_qty",
        header: ({ column }) => (
          <DataGridColumnHeader title="MOQ" visibility={false} column={column} />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              className="border-border/60 h-9 w-full rounded-md text-right text-sm tabular-nums"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.moq_qty`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 104,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        accessorKey: "price",
        id: "price",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Price"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0.00"
              className="border-border/60 h-9 w-full rounded-md text-right text-sm tabular-nums"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.price`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 148,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        accessorKey: "tax_profile_name",
        id: "tax_profile_name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax Profile"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          // taxProfiles (prop) มาจาก endpoint แยก — portal public เรียก auth lookup
          // ไม่ได้ · เซลล์นี้เป็น select อย่างเดียว (tax amount แยกไปคอลัมน์หลัง PWT)
          return (
            <TaxProfileCell
              form={form}
              index={fieldIndex}
              taxProfiles={taxProfiles}
            />
          );
        },
        size: 160,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      },
      {
        id: "pwt",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Price without Tax"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return <RowPWT form={form} index={fieldIndex} />;
        },
        size: 150,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        id: "tax_amount",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax Amount"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return <RowTaxAmount form={form} index={fieldIndex} />;
        },
        size: 128,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        accessorKey: "lead_time_days",
        id: "lead_time_days",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Lead Time"
            visibility={false}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <FieldInput
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              className="border-border/60 h-9 w-full rounded-md text-right text-sm tabular-nums"
              {...form.register(
                `tb_pricelist_detail.${fieldIndex}.lead_time_days`,
                { valueAsNumber: true },
              )}
            />
          );
        },
        size: 100,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        id: "actions",
        header: () => (
          <span className="text-muted-foreground text-[0.6875rem]">
            Tiers
          </span>
        ),
        cell: ({ row }) => {
          const itemIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <div className="flex items-center justify-center">
              {/* icon plus + tooltip บอกว่าปุ่มนี้ทำอะไร */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add pricing tier"
                    onClick={() => addTierToItem(itemIndex, row.id)}
                    className="text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <Plus className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Add pricing tier</TooltipContent>
              </Tooltip>
            </div>
          );
        },
        size: 72,
        enableResizing: false,
        meta: {
          expandedContent: (row: PricelistExternalDetailDto) => {
            const fieldIndex = fields.findIndex((f) => f.id === row.id);
            return <MoqTiersEditor form={form} index={fieldIndex} />;
          },
        },
      },
    ],
    // form เป็น stable ref จาก useForm · taxProfiles จาก query cache (ref นิ่งจน
    // โหลดเสร็จ) — เพิ่มได้โดยไม่ทำให้ columns recreate ต่อ render
    // (อย่าใส่ handleTiersUpdate ที่ recreate ทุก render ไม่งั้น columns จะ recreate →
    // row remount → focus หายกลับมา ซึ่งเป็นบั๊กที่เพิ่งแก้)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, form, taxProfiles],
  );


  // Table for edit mode
  const editTable = useReactTable({
    data: fields,
    columns,
    pageCount: Math.ceil((fields?.length || 0) / pagination.pageSize),
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
    state: {
      pagination,
      sorting,
      expanded: expandedRows,
    },
    columnResizeMode: "onChange",
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onExpandedChange: setExpandedRows,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isViewMode) {
    // view mode mirror หน้า price list ภายใน 100% — grouped table เดียวกัน
    // (# · Product · MOQ Pricing · Rate · Amount, group product ด้วย rowspan)
    return (
      <PLProductGroupedView
        detailRefs={fields}
        tfl={(key) => VIEW_LABELS[key] ?? key}
      />
    );
  }

  return (
    <DataGrid
      table={editTable}
      recordCount={fields?.length || 0}
      tableLayout={{
        columnsPinnable: false,
        columnsResizable: false,
        columnsMovable: false,
        columnsVisibility: false,
      }}
    >
      <div className="w-full space-y-2">
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        <DataGridPagination />
        </DataGridContainer>
        <div className="flex items-center gap-2 justify-end">
          {hasPendingChanges && (
            <Badge variant="warning" className="text-xs">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSaving || isSubmitting}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </DataGrid>
  );
}
