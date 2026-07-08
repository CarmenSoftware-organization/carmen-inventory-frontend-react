
import { useState, useEffect } from "react";
import { useTranslations } from "use-intl";
import { FileText, Package, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyComponent from "@/components/empty-component";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { formatCurrency } from "@/lib/currency-utils";
import { formatDate } from "@/lib/date-utils";

export interface PricelistEntry {
  vendor_id: string;
  vendor_name: string;
  pricelist_detail_id: string;
  pricelist_no: string;
  price: number;
  currency: string;
  unit_name: string;
  base_price: number;
  base_currency: string;
  exchange_rate: number;
  effective_date: { from: string; to: string };
  is_preferred?: boolean;
}

/**
 * สร้าง column definitions สำหรับตารางเปรียบเทียบราคา — premium ERP design
 *
 * เพิ่ม highlight ราคาต่ำสุด (best deal), badge เมื่อ preferred vendor,
 * ปุ่ม Select variant success เมื่อเลือกได้
 */
const buildColumns = (
  dateFormat: string,
  tfl: ReturnType<typeof useTranslations>,
  t: ReturnType<typeof useTranslations>,
  readOnly: boolean,
  minPrice: number,
): ColumnDef<PricelistEntry>[] => {
  const base: ColumnDef<PricelistEntry>[] = [
    {
      accessorKey: "vendor_name",
      header: tfl("vendor"),
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">
            {row.original.vendor_name}
          </span>
          {row.original.is_preferred && (
            <Badge
              variant="success-light"
              size="xs"
              className="text-[0.625rem]"
            >
              ★ {t("preferred")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "pricelist_no",
      header: t("pricelistNo"),
      size: 140,
      cell: ({ getValue }) => (
        <Badge variant="outline" size="xs" className="text-[0.625rem]">
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      accessorKey: "unit_name",
      header: tfl("unit"),
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-muted-foreground text-center",
      },
      size: 80,
    },
    {
      accessorKey: "price",
      header: tfl("price"),
      meta: {
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
      size: 120,
      cell: ({ row }) => {
        const price = row.original.price;
        const isBest = price === minPrice && minPrice > 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {isBest && (
              <Badge
                variant="success-light"
                size="xs"
                className="text-[0.625rem]"
              >
                {t("best")}
              </Badge>
            )}
            <span
              className={`tabular-nums ${isBest ? "text-success font-semibold" : "font-semibold"}`}
            >
              {formatCurrency(price)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "currency",
      header: tfl("currency"),
      meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
      size: 80,
      cell: ({ getValue }) => (
        <Badge variant="outline" size="xs" className="text-[0.625rem]">
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      id: "effective",
      header: t("effective"),
      meta: { cellClassName: "text-muted-foreground whitespace-nowrap" },
      cell: ({ row }) => {
        const { from, to } = row.original.effective_date ?? {};
        const f = formatDate(from, dateFormat);
        const toDate = formatDate(to, dateFormat);
        return f && toDate ? (
          <span className="text-[0.6875rem] tabular-nums">
            {f} → {toDate}
          </span>
        ) : (
          ""
        );
      },
    },
  ];
  if (readOnly) return base;
  return [
    ...base,
    {
      id: "select",
      header: "",
      size: 90,
      meta: { cellClassName: "text-right" },
      cell: () => (
        <Button type="button" size="xs" variant="success">
          Select
        </Button>
      ),
    },
  ];
};

interface PrPricelistDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly productId: string;
  readonly productName: string;
  readonly unitId: string;
  readonly currencyId: string;
  readonly atDate: string;
  readonly requestedQty: number;
  readonly requestedUnitName: string;
  readonly approvedQty: number;
  readonly approvedUnitName: string;
  readonly onSelect: (entry: PricelistEntry) => void;
  readonly readOnly?: boolean;
}

/**
 * Dialog แสดงรายการราคาของสินค้าให้เลือกเพื่อใช้ในรายการ PR — premium ERP
 *
 * โหลดราคาจาก API price-compare แสดงตาราง + highlight best price + preferred
 * vendor badge + คลิก row เพื่อเลือก (หรือปุ่ม Select)
 */
export function PrPricelistDialog({
  open,
  onOpenChange,
  productId,
  productName,
  unitId,
  currencyId,
  atDate,
  requestedQty,
  requestedUnitName,
  approvedQty,
  approvedUnitName,
  onSelect,
  readOnly = false,
}: PrPricelistDialogProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const { buCode, dateFormat } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [lists, setLists] = useState<PricelistEntry[]>([]);

  useEffect(() => {
    if (!open || !productId || !unitId || !currencyId || !buCode) return;

    const fetchPriceLists = async () => {
      setIsLoading(true);
      setLists([]);
      try {
        const url = buildUrl(API_ENDPOINTS.PRICE_LIST_COMPARE(buCode), {
          product_id: productId,
          unit_id: unitId,
          at_date: atDate,
          currency_id: currencyId,
        });
        const res = await httpClient.get(url);
        if (!res.ok) return;
        const json = await res.json();
        setLists(json.data?.lists ?? []);
      } catch {
        toast.error(t("priceListLoadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceLists();
  }, [open, productId, unitId, currencyId, atDate, buCode]);

  const handleSelect = (entry: PricelistEntry) => {
    if (readOnly) return;
    onSelect(entry);
    onOpenChange(false);
  };

  const minPrice =
    lists.length > 0
      ? Math.min(...lists.map((l) => l.price).filter((p) => p > 0))
      : 0;

  const maxPrice = lists.length > 0 ? Math.max(...lists.map((l) => l.price)) : 0;

  const savingPct =
    minPrice === 0 || maxPrice === 0 || minPrice === maxPrice
      ? 0
      : Math.round(((maxPrice - minPrice) / maxPrice) * 100);

  const pricelistColumns = buildColumns(dateFormat, tfl, t, readOnly, minPrice);

  const table = useReactTable({
    data: lists,
    columns: pricelistColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.pricelist_detail_id,
  });

  const emptyMessage = (
    <EmptyComponent
      icon={FileText}
      title={t("noPriceList")}
      description={t("noPriceListDesc")}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-5xl">
        <div className="space-y-4 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="truncate text-base">
              {productName}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("priceListComparison")}
            </DialogDescription>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem]">
              <span className="inline-flex items-center gap-1">
                <Package className="size-3" />
                {tfl("requested")}:{" "}
                <span className="text-foreground font-semibold tabular-nums">
                  {requestedQty} {requestedUnitName}
                </span>
              </span>
              {approvedQty > 0 && (
                <>
                  <span className="bg-border h-3 w-px" />
                  <span className="inline-flex items-center gap-1">
                    <Receipt className="size-3" />
                    {tfl("approved")}:{" "}
                    <span className="text-foreground font-semibold tabular-nums">
                      {approvedQty} {approvedUnitName}
                    </span>
                  </span>
                </>
              )}
            </div>
          </DialogHeader>

          {!isLoading && lists.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile
                label={tfl("vendor")}
                value={lists.length.toString()}
                unit={lists.length === 1 ? t("vendorSingular") : t("vendorPlural")}
              />
              <SummaryTile
                label={t("bestPrice")}
                value={formatCurrency(minPrice)}
                unit={lists[0]?.currency}
                accent="success"
              />
              {savingPct > 0 && (
                <SummaryTile
                  label={t("maxSavings")}
                  value={`${savingPct}%`}
                  unit={t("vsHighest")}
                  accent="primary"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
          <DataGrid
            table={table}
            recordCount={lists.length}
            isLoading={isLoading}
            loadingMode="spinner"
            emptyMessage={emptyMessage}
            onRowClick={readOnly ? undefined : handleSelect}
            tableLayout={{
              headerBackground: true,
              headerSticky: true,
              rowBorder: true,
            }}
            tableClassNames={{
              base: "text-sm",
              headerRow: "h-10",
              bodyRow: "h-11 hover:bg-primary/5 cursor-pointer",
            }}
          >
            <DataGridContainer className="rounded-lg border">
              <DataGridTable />
            </DataGridContainer>
          </DataGrid>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  unit,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly accent?: "success" | "primary";
}) {
  const bg =
    accent === "success"
      ? "bg-success/5 border-success/30"
      : accent === "primary"
        ? "bg-primary/5 border-primary/30"
        : "bg-muted/40";
  const textColor =
    accent === "success"
      ? "text-success"
      : accent === "primary"
        ? "text-primary"
        : "";
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold tabular-nums ${textColor}`}>
        {value}
      </p>
      {unit && <p className="text-muted-foreground text-[0.625rem]">{unit}</p>}
    </div>
  );
}
