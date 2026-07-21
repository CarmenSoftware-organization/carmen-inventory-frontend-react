
import { useMemo, useState } from "react";
import {
  Controller,
  type UseFormReturn,
  useFieldArray,
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
import { Save, Send, SquareMinus, SquarePlus } from "lucide-react";
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
import MoqTiersSubTable from "./moq-tiers-sub-table";
import { PLProductGroupedView } from "@/routes/vendor-management/price-list/pl-product-grouped-view";
import type {
  PricelistExternalDto,
  PricelistExternalDetailDto,
  PricelistExternalTaxProfileOption,
} from "@/types/price-list-external";

// label ของ grouped view (mirror price list ภายใน) — portal เป็น public ใช้
// อังกฤษล้วนเหมือน header ส่วนอื่นของหน้านี้
const VIEW_LABELS: Record<string, string> = {
  product: "Product",
  moqPricing: "MOQ Pricing",
  rate: "Rate",
  amount: "Amount",
};

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
  const handleTiersUpdate = (
    itemIndex: number,
    tiers: PricelistExternalDetailDto["moq_tiers"],
  ) => {
    form.setValue(`tb_pricelist_detail.${itemIndex}.moq_tiers`, tiers, {
      shouldDirty: true,
    });
  };

  const columns = useMemo<ColumnDef<PricelistExternalDetailDto>[]>(
    () => [
      {
        id: "no",
        header: "#",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.sequence_no}</span>
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
            visibility={true}
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
        size: 300,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "unit_name",
        id: "unit_name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.unit_name || "—"}
          </span>
        ),
        size: 80,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "moq_qty",
        id: "moq_qty",
        header: ({ column }) => (
          <DataGridColumnHeader title="MOQ" visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <FieldInput
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.moq_qty`, {
                valueAsNumber: true,
              })}
            />
          );
        },
        size: 80,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "price_without_tax",
        id: "price_without_tax",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit Price"
            visibility={true}
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
              className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
              {...form.register(
                `tb_pricelist_detail.${fieldIndex}.price_without_tax`,
                { valueAsNumber: true },
              )}
            />
          );
        },
        size: 110,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "tax_profile_name",
        id: "tax_profile_name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax Profile"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          // taxProfiles (prop) มาจาก endpoint แยก — portal public เรียก auth lookup
          // ไม่ได้ · เลือกแล้ว sync name + rate ของแถว
          return (
            <Controller
              control={form.control}
              name={`tb_pricelist_detail.${fieldIndex}.tax_profile_id`}
              render={({ field }) => (
                <FieldSelect
                  value={field.value}
                  onValueChange={(id) => {
                    field.onChange(id);
                    const tp = taxProfiles.find((t) => t.id === id);
                    form.setValue(
                      `tb_pricelist_detail.${fieldIndex}.tax_profile_name`,
                      tp?.name ?? null,
                    );
                    form.setValue(
                      `tb_pricelist_detail.${fieldIndex}.tax_rate`,
                      tp?.tax_rate ?? 0,
                    );
                  }}
                  placeholder="—"
                  className="h-8 text-xs"
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
        },
        size: 140,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "lead_time_days",
        id: "lead_time_days",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Lead Time"
            visibility={true}
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
              className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
              {...form.register(
                `tb_pricelist_detail.${fieldIndex}.lead_time_days`,
                { valueAsNumber: true },
              )}
            />
          );
        },
        size: 100,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        id: "expand",
        header: () => null,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <Button
              onClick={row.getToggleExpandedHandler()}
              size="sm"
              variant="ghost"
            >
              {row.getIsExpanded() ? (
                <SquareMinus className="h-4 w-4" />
              ) : (
                <SquarePlus className="h-4 w-4" />
              )}
            </Button>
          ) : null;
        },
        size: 50,
        enableResizing: false,
        meta: {
          expandedContent: (row: PricelistExternalDetailDto) => {
            const fieldIndex = fields.findIndex((f) => f.id === row.id);
            return (
              <MoqTiersSubTable
                tiers={row.moq_tiers || []}
                onTiersUpdate={(tiers) => handleTiersUpdate(fieldIndex, tiers)}
              />
            );
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
        columnsPinnable: true,
        columnsResizable: true,
        columnsMovable: true,
        columnsVisibility: true,
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
            disabled={!hasPendingChanges || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={hasPendingChanges || isSubmitting}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </DataGrid>
  );
}
