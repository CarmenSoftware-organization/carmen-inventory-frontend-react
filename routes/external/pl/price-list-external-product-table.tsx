
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
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import MoqTiersSubTable from "./moq-tiers-sub-table";
import type {
  PricelistExternalDto,
  PricelistExternalDetailDto,
  PricelistExternalTaxProfileOption,
} from "@/types/price-list-external";

// Type for grouped rows in view mode
interface GroupedProductRow {
  product_id: string;
  product_name: string;
  itemCount: number;
  prices: number[];
  prices_without_tax: number[];
  tax_amts: number[];
  moq_qtys: number[];
  unit_names: string[];
  tax_profile_names: string[];
  lead_time_days_list: number[];
  sequence_nos: number[];
}

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

  // Grouped table data for view mode only
  const groupedTableData = useMemo(() => {
    if (!isViewMode) return [];

    const groupMap = new Map<string, GroupedProductRow>();

    for (const item of fields || []) {
      const key = item.product_id || `ungrouped-${item.id}`;

      if (groupMap.has(key)) {
        const group = groupMap.get(key)!;
        group.itemCount++;
        group.prices.push(item.price);
        group.prices_without_tax.push(item.price_without_tax ?? 0);
        group.tax_amts.push(item.tax_amt ?? 0);
        group.moq_qtys.push(item.moq_qty ?? 0);
        group.unit_names.push(item.unit_name || "-");
        group.tax_profile_names.push(item.tax_profile_name || "-");
        group.lead_time_days_list.push(item.lead_time_days ?? 0);
        group.sequence_nos.push(item.sequence_no ?? 0);
      } else {
        groupMap.set(key, {
          product_id: item.product_id || "",
          product_name: item.product_name || "",
          itemCount: 1,
          prices: [item.price],
          prices_without_tax: [item.price_without_tax ?? 0],
          tax_amts: [item.tax_amt ?? 0],
          moq_qtys: [item.moq_qty ?? 0],
          unit_names: [item.unit_name || "-"],
          tax_profile_names: [item.tax_profile_name || "-"],
          lead_time_days_list: [item.lead_time_days ?? 0],
          sequence_nos: [item.sequence_no ?? 0],
        });
      }
    }

    return Array.from(groupMap.values());
  }, [fields, isViewMode]);

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
          <div className="font-semibold text-primary text-xs">
            {row.original.product_name}
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
          <Badge variant="secondary" className="text-xs">
            {row.original.unit_name || "-"}
          </Badge>
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
            <Input
              type="text"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.moq_qty`)}
              className="h-7 text-xs text-right"
            />
          );
        },
        size: 80,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "price",
        id: "price",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Price"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <Input
              type="text"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.price`)}
              className="h-7 text-xs text-right font-semibold"
            />
          );
        },
        size: 100,
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
            <Input
              type="number"
              {...form.register(
                `tb_pricelist_detail.${fieldIndex}.lead_time_days`,
                { valueAsNumber: true },
              )}
              className="h-7 text-xs"
              min={0}
              placeholder="Days"
            />
          );
        },
        size: 100,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "price_without_tax",
        id: "price_without_tax",
        header: ({ column }) => (
          <DataGridColumnHeader title="PWT" visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <Input
              type="text"
              {...form.register(
                `tb_pricelist_detail.${fieldIndex}.price_without_tax`,
              )}
              className="h-7 text-xs text-right"
            />
          );
        },
        size: 100,
        enableSorting: true,
        enableHiding: true,
        enableResizing: true,
      },
      {
        accessorKey: "tax_amt",
        id: "tax_amt",
        header: ({ column }) => (
          <DataGridColumnHeader title="Tax" visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const fieldIndex = fields.findIndex((f) => f.id === row.original.id);
          return (
            <Input
              type="text"
              {...form.register(`tb_pricelist_detail.${fieldIndex}.tax_amt`)}
              className="h-7 text-xs text-right"
            />
          );
        },
        size: 80,
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
                  className="h-7 text-xs"
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
    // clean read layout — product แต่ละตัวโชว์ชั้น MOQ → ราคา แบบเรียบ (label
    // recede, ราคา dominant tabular) ไม่ต้องมี grid chrome/pagination/sort ใน
    // portal ที่มีสินค้าไม่กี่ตัว
    return (
      <div className="divide-border overflow-hidden rounded-lg border border-border divide-y">
        {groupedTableData.map((product) => (
          <div key={product.product_id} className="px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">
              {product.product_name}
            </p>
            <div className="mt-2 space-y-1">
              {product.moq_qtys.map((moq, i) => (
                <div
                  key={product.sequence_nos[i]}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="text-muted-foreground">
                    MOQ {moq}+ · {product.unit_names[i]}
                    {product.lead_time_days_list[i]
                      ? ` · ${product.lead_time_days_list[i]}d`
                      : ""}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {product.prices[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
