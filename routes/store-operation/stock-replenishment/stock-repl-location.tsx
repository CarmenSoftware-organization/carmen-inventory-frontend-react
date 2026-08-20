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
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
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

export function StockReplLocation({
  location,
  selectedIds,
  open,
  onOpenChange,
  onSelectionChange,
}: StockReplLocationProps) {
  "use no memo";
  const t = useTranslations("storeOperation.stockReplenishment");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tl = useTranslations("lookup");

  // สีอยู่ที่ dot ตัวเดียว chip เป็นกลาง ตาม pattern StatusDotBadge ของแอป
  const STATUS_CONFIG = {
    critical: { tone: "destructive" as const, label: ts("critical") },
    warning: { tone: "warning" as const, label: ts("warning") },
    low: { tone: "neutral" as const, label: ts("low") },
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
      // select-all ย้ายไปเป็น checkbox ที่หัวแถว location แล้ว — ไม่ใส่ซ้ำใน
      // หัวตาราง (สอง control ป้ายเดียวกันชี้งานเดียวกัน)
      header: () => "",
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(checked) =>
            handleSelectProduct(row.original, checked === true)
          }
          aria-label={tl("select", { entity: row.original.name })}
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
      // ชื่อหลักบน local name เป็นบรรทัดรองข้างล่าง — ยาวเกินคอลัมน์ให้ตัดด้วย
      // ellipsis (table เป็น table-fixed ความกว้างตาม size ข้างล่าง)
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate" title={row.getValue("name")}>
            {row.getValue("name") || "..."}
          </p>
          {row.original.local_name && (
            <p
              className="text-muted-foreground text-micro truncate"
              title={row.original.local_name}
            >
              {row.original.local_name}
            </p>
          )}
        </div>
      ),
      enableSorting: false,
      size: 180,
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
      accessorKey: "on_hand_qty",
      header: tfl("onHandQty"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("on_hand_qty")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "min_qty",
      header: tfl("minQty"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("min_qty")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "max_qty",
      header: tfl("maxQty"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("max_qty")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "par_qty",
      header: tfl("parQty"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("par_qty")}</span>
      ),
      enableSorting: false,
      size: 80,
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      accessorKey: "reorder_qty",
      header: tfl("reorderQty"),
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {row.getValue("reorder_qty")}
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
          <StatusDotBadge tone={config.tone} size="xs">
            {config.label}
          </StatusDotBadge>
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
      <div className="bg-muted/40 hover:bg-muted/70 flex w-full items-center gap-2 rounded-md border px-3 py-2 transition-colors">
        <Checkbox
          checked={someSelected ? "indeterminate" : allSelected}
          onCheckedChange={(checked) => handleSelectAll(checked === true)}
          aria-label={t("selectAllIn", { location: location.location_name })}
        />
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left text-sm font-semibold">
          <ChevronRight
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="flex-1">
            <span className="text-muted-foreground mr-1.5 text-xs font-normal">
              {location.location_code}
            </span>
            {location.location_name}
          </span>
          <Badge variant="secondary" size="sm">
            {t("nItems", { count: products.length })}
          </Badge>
          {criticalCount > 0 && (
            <StatusDotBadge tone="destructive" size="sm">
              {t("nCritical", { count: criticalCount })}
            </StatusDotBadge>
          )}
          {warningCount > 0 && (
            <StatusDotBadge tone="warning" size="sm">
              {t("nWarning", { count: warningCount })}
            </StatusDotBadge>
          )}
          {lowCount > 0 && (
            <StatusDotBadge tone="neutral" size="sm">
              {t("nLow", { count: lowCount })}
            </StatusDotBadge>
          )}
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="mt-1">
          {/* checkbox: true จำเป็น — DataGridTable กรองคอลัมน์ id "select" ทิ้ง
              เมื่อ flag นี้ปิด (default) ทำให้ checkbox รายแถวหายทั้งคอลัมน์ */}
          <DataGrid
            table={table}
            recordCount={products.length}
            tableLayout={{ checkbox: true }}
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
