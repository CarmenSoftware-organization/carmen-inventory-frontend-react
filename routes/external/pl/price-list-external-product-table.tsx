
import { useMemo, useState } from "react";
import { type UseFormReturn, useFieldArray } from "react-hook-form";
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
import MoqTiersSubTable from "./moq-tiers-sub-table";
import type {
  PricelistExternalDto,
  PricelistExternalDetailDto,
} from "@/types/price-list-external";

// Type for grouped rows in view mode
interface GroupedProductRow {
  product_id: string;
  product_name: string;
  itemCount: number;
  prices: string[];
  prices_without_tax: string[];
  tax_amts: string[];
  moq_qtys: string[];
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
        group.prices_without_tax.push(item.price_without_tax || "0");
        group.tax_amts.push(item.tax_amt || "0");
        group.moq_qtys.push(item.moq_qty || "0");
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
          prices_without_tax: [item.price_without_tax || "0"],
          tax_amts: [item.tax_amt || "0"],
          moq_qtys: [item.moq_qty || "0"],
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
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.tax_profile_name || "-"}
          </span>
        ),
        size: 120,
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
    // form เป็น stable ref จาก useForm — เพิ่มได้โดยไม่ทำให้ columns recreate ต่อ render
    // (อย่าใส่ handleTiersUpdate ที่ recreate ทุก render ไม่งั้น columns จะ recreate →
    // row remount → focus หายกลับมา ซึ่งเป็นบั๊กที่เพิ่งแก้)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, form],
  );

  // Columns for view mode (grouped data - displays combined pricing info)
  const viewModeColumns = useMemo<ColumnDef<GroupedProductRow>[]>(
    () => [
      {
        id: "no",
        header: "#",
        cell: ({ row }) => <span className="text-xs">{row.index + 1}</span>,
        size: 50,
        enableSorting: false,
      },
      {
        accessorKey: "product_name",
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
      },
      {
        id: "pricing",
        header: ({ column }) => (
          <DataGridColumnHeader title="MOQ" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {row.original.moq_qtys.map((moq, i) => (
              <span
                key={`${row.original.product_id}-moq-${row.original.sequence_nos[i]}`}
                className="text-xs"
              >
                {moq}+ {row.original.unit_names[i]}→{row.original.prices[i]}(
                {row.original.lead_time_days_list[i]}d)
              </span>
            ))}
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: "prices_without_tax",
        header: ({ column }) => (
          <DataGridColumnHeader title="PWT" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {row.original.prices_without_tax.map((p, i) => (
              <span
                key={`${row.original.product_id}-pwt-${row.original.sequence_nos[i]}`}
                className="text-xs"
              >
                {p}
              </span>
            ))}
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: "tax_amts",
        header: ({ column }) => (
          <DataGridColumnHeader title="Tax" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {row.original.tax_amts.map((t, i) => (
              <span
                key={`${row.original.product_id}-tax-${row.original.sequence_nos[i]}`}
                className="text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        ),
        size: 80,
      },
      {
        accessorKey: "tax_profile_names",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax Profile"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            {row.original.tax_profile_names.map((t, i) => (
              <span
                key={`${row.original.product_id}-taxprofile-${row.original.sequence_nos[i]}`}
                className="text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        ),
        size: 120,
      },
    ],
    [],
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

  // Table for view mode (grouped rows)
  const viewTable = useReactTable({
    data: groupedTableData,
    columns: viewModeColumns,
    pageCount: Math.ceil((groupedTableData?.length || 0) / pagination.pageSize),
    getRowId: (row) => row.product_id || `ungrouped-${row.product_name}`,
    state: {
      pagination,
      sorting,
    },
    columnResizeMode: "onChange",
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isViewMode) {
    return (
      <DataGrid
        table={viewTable}
        recordCount={groupedTableData.length}
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
        </div>
      </DataGrid>
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
