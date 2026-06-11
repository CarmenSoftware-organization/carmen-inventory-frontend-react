"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import type { Location, ProductLocation } from "@/types/stock-replenishment";

interface StockReplLocationProps {
  readonly location: Location;
  readonly selectedIds: Set<string>;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectionChange: (
    locationId: string,
    selectedIds: Set<string>,
  ) => void;
}

/**
 * แสดง location 1 แห่งในหน้า Stock Replenishment แบบ collapsible
 * มีตารางรายการสินค้าที่ต้องเติมพร้อม checkbox เลือก และ badge สรุปสถานะ
 *
 * @param props - location, selectedIds, open state, onOpenChange และ onSelectionChange
 * @param props.location - ข้อมูล Location พร้อม products_location
 * @param props.selectedIds - Set ของ product id ที่เลือก
 * @param props.open - สถานะ collapsible
 * @param props.onOpenChange - callback เปลี่ยน open
 * @param props.onSelectionChange - callback เมื่อเปลี่ยน selection
 * @returns คอมโพเนนต์ location collapsible พร้อมตาราง
 * @example
 * <StockReplLocation location={loc} selectedIds={ids} open={true}
 *   onOpenChange={setOpen} onSelectionChange={handleChange} />
 */
export function StockReplLocation({
  location,
  selectedIds,
  open,
  onOpenChange,
  onSelectionChange,
}: StockReplLocationProps) {
  const t = useTranslations("storeOperation.stockReplenishment");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const STATUS_CONFIG = {
    critical: { variant: "destructive" as const, label: ts("critical") },
    warning: { variant: "warning" as const, label: ts("warning") },
    low: { variant: "secondary" as const, label: ts("low") },
  };

  const products = location.products_location;
  const criticalCount = products.filter((p) => p.status === "critical").length;
  const warningCount = products.filter((p) => p.status === "warning").length;
  const lowCount = products.filter((p) => p.status === "low").length;
  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected =
    products.some((p) => selectedIds.has(p.id)) && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(products.map((p) => p.id));
      onSelectionChange(location.location_id, allIds);
    } else {
      onSelectionChange(location.location_id, new Set());
    }
  };

  const handleSelectProduct = (product: ProductLocation, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(product.id);
    } else {
      next.delete(product.id);
    }
    onSelectionChange(location.location_id, next);
  };

  const columns: ColumnDef<ProductLocation>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          {...(someSelected ? { "data-state": "indeterminate" } : {})}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label={t("selectAllIn", { location: location.location_name })}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(checked) =>
            handleSelectProduct(row.original, checked === true)
          }
          aria-label={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
      size: 40,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
    {
      id: "index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.index + 1}</span>
      ),
      enableSorting: false,
      size: 40,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
    {
      accessorKey: "name",
      header: tfl("product"),
      cell: ({ row }) => row.getValue("name"),
      enableSorting: false,
    },
    {
      id: "category",
      header: tfl("category"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.category.name}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "sub_category",
      header: tfl("subCategory"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.sub_category.name}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "item_group",
      header: tfl("itemGroup"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.item_group.name}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "current",
      header: tfl("current"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("current")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "par_level",
      header: tfl("parLevel"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("par_level")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "need",
      header: tfl("need"),
      cell: ({ row }) => (
        <span className="tabular-nums font-semibold">
          {row.getValue("need")}
        </span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      id: "status",
      header: tfl("status"),
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status];
        return (
          <Badge variant={config.variant} size="xs">
            {config.label}
          </Badge>
        );
      },
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-left text-sm font-medium hover:bg-muted/70 transition-colors">
        <ChevronRight
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="flex-1">{location.location_name}</span>
        <Badge variant="secondary" size="sm">
          {t("nItems", { count: products.length })}
        </Badge>
        {criticalCount > 0 && (
          <Badge variant="destructive" size="sm">
            {t("nCritical", { count: criticalCount })}
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="warning" size="sm">
            {t("nWarning", { count: warningCount })}
          </Badge>
        )}
        {lowCount > 0 && (
          <Badge variant="secondary" size="sm">
            {t("nLow", { count: lowCount })}
          </Badge>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-1">
          <DataGrid
            table={table}
            recordCount={products.length}
          >
            <DataGridContainer>
              <DataGridTable />
            </DataGridContainer>
          </DataGrid>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
