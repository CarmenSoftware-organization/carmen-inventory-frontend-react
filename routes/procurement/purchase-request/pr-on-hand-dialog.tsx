import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { FileText, Warehouse } from "lucide-react";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import EmptyComponent from "@/components/empty-component";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import {
  useProductOnHand,
  type OnHandLocationRow,
} from "@/hooks/use-product-on-hand";

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly productId: string;
}

export function PrOnHandDialog({ open, onOpenChange, productId }: Props) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const { data, isLoading } = useProductOnHand(open ? productId : undefined);

  const rows: OnHandLocationRow[] = data?.locations ?? [];
  const totalQty = Number(data?.total_on_hand ?? 0);
  const summaryUnit = data?.inventory_unit_name ?? "";

  const columns = useMemo<ColumnDef<OnHandLocationRow>[]>(
    () => [
      {
        id: "index",
        header: () => "#",
        cell: ({ row }) => row.index + 1,
        size: 56,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        accessorKey: "location_code",
        header: () => tfl("code"),
        cell: ({ row }) => (
          <span className="text-[0.6875rem]">
            {row.original.location_code ?? "—"}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "location_name",
        header: () => tfl("location"),
        cell: ({ row }) => {
          const name = row.original.location_name ?? "—";
          if (!row.original.location_id) return <span>{name}</span>;
          return (
            <Link
              to={`/config/location/${row.original.location_id}`}
              onClick={() => onOpenChange(false)}
              className="hover:text-primary focus-visible:text-primary inline-flex items-center hover:underline focus-visible:underline"
            >
              {name}
            </Link>
          );
        },
        size: 220,
      },
      {
        accessorKey: "location_type",
        header: () => tfl("locationType"),
        cell: ({ row }) => {
          const type = row.original.location_type;
          if (!type) return <span className="text-muted-foreground">—</span>;
          return (
            <Badge variant="outline" size="xs" className="capitalize">
              {type.toLowerCase().replace(/_/g, " ")}
            </Badge>
          );
        },
        size: 140,
      },
      {
        accessorKey: "on_hand_qty",
        header: () => tfl("quantity"),
        cell: ({ row }) => {
          const qty = Number(row.original.on_hand_qty ?? 0);
          return <span className="font-semibold">{qty}</span>;
        },
        size: 160,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [tfl, onOpenChange],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.location_id ?? "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
        <div className="relative space-y-4 px-6 pt-10 pb-6">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="bg-muted text-info flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Warehouse className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="bg-info/10 text-info-foreground mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                  {t("inventoryInfo")}
                </div>
                <DialogTitle className="text-base">{t("onHand")}</DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        size="xs"
                        className="text-[0.625rem]"
                      >
                        {data?.product_code ?? "—"}
                      </Badge>
                      <span className="text-foreground text-sm font-semibold">
                        {data?.product_name ?? "—"}
                      </span>
                    </div>
                    {data?.product_local_name &&
                      data.product_local_name !== data.product_name && (
                        <p className="text-muted-foreground text-xs">
                          {data.product_local_name}
                        </p>
                      )}
                  </div>
                </DialogDescription>
              </div>
              {!isLoading && rows.length > 0 && (
                <div className="text-right">
                  <p className="text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase">
                    {tfl("total")}
                  </p>
                  <p className="text-info text-lg leading-tight font-semibold tabular-nums">
                    {totalQty.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-[0.625rem]">
                    {summaryUnit}
                  </p>
                </div>
              )}
            </div>
          </DialogHeader>

          <DataGrid
            table={table}
            recordCount={rows.length}
            isLoading={isLoading}
            tableLayout={{ headerSticky: true, rowBorder: true }}
            emptyMessage={
              <EmptyComponent icon={FileText} title={tc("noData")} />
            }
          >
            <DataGridContainer className="flex max-h-[60vh] flex-col rounded-lg border">
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
      </DialogContent>
    </Dialog>
  );
}
