import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Columns3, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { Button } from "@/components/ui/button";
import { CellAction } from "@/components/ui/cell-action";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { StatusDotBadge, type DotTone } from "@/components/ui/status-dot-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AR_INVOICES,
  AR_INVOICE_PATH,
  invoiceTotals,
  money,
  type ArInvoice,
} from "./ar-invoice-model";

const statusTone: Record<ArInvoice["status"], DotTone> = {
  Draft: "neutral",
  Submitted: "warning",
  Approved: "info",
  Posted: "success",
  Void: "neutral",
};

function InvoiceStatus({ status }: { status: ArInvoice["status"] }) {
  return <StatusDotBadge tone={statusTone[status]} size="xs">{status}</StatusDotBadge>;
}

export function Component() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return AR_INVOICES.filter((invoice) =>
      `${invoice.docNo} ${invoice.customerName} ${invoice.customerCode} ${invoice.sourceDoc}`
        .toLowerCase()
        .includes(term),
    );
  }, [search]);
  const columns = useMemo<ColumnDef<ArInvoice>[]>(() => [
    {
      accessorKey: "docNo",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Doc No." />,
      cell: ({ row }) => (
        <CellAction onClick={() => navigate(`${AR_INVOICE_PATH}/${row.original.id}`)}>
          {row.original.docNo}
        </CellAction>
      ),
      enableHiding: false,
      meta: { headerTitle: "Doc No." },
    },
    {
      accessorKey: "inputDate",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Input Date" />,
      meta: { headerTitle: "Input Date", cellClassName: "tabular-nums" },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <DataGridColumnHeader column={column} title="Customer (AR)" />,
      cell: ({ row }) => (
        <div>
          <span className="block max-w-56 truncate" title={row.original.customerName}>
            {row.original.customerName}
          </span>
          <span className="text-muted-foreground text-xs">{row.original.customerCode}</span>
        </div>
      ),
      meta: { headerTitle: "Customer (AR)" },
    },
    { accessorKey: "source", header: "Source", meta: { headerTitle: "Source" } },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <InvoiceStatus status={row.original.status} />,
      meta: { headerTitle: "Status" },
    },
    {
      id: "total",
      header: "Grand Total",
      accessorFn: (invoice) => invoiceTotals(invoice).total,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{money(row.getValue<number>("total"))} {row.original.currency}</span>,
      meta: { headerTitle: "Grand Total", headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      id: "unpaid",
      header: "Unpaid",
      accessorFn: (invoice) => invoiceTotals(invoice).unpaid,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{money(row.getValue<number>("unpaid"))} {row.original.currency}</span>,
      meta: { headerTitle: "Unpaid", headerClassName: "text-right", cellClassName: "text-right" },
    },
  ], [navigate]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DocumentListHeader title="AR Invoice Directory" description="City ledger and customer invoices" count={rows.length} />
        <Button size="sm" onClick={() => navigate(`${AR_INVOICE_PATH}/new`)}>
          <Plus className="size-4" /> New Invoice
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-52 sm:w-64">
          <SearchInput defaultValue={search} onSearch={setSearch} onInputChange={setSearch} />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <DataGridSortMenu table={table} />
          <DataGridColumnVisibility
            table={table}
            trigger={<Button size="icon-sm" variant="outline" aria-label="Toggle columns"><Columns3 className="size-4" /></Button>}
          />
        </div>
      </div>
      {isMobile ? (
        rows.length ? (
          <div className="grid gap-3">
            {rows.map((invoice) => {
              const totals = invoiceTotals(invoice);
              return (
                <ListCard
                  key={invoice.id}
                  title={invoice.docNo}
                  badge={<InvoiceStatus status={invoice.status} />}
                  onOpen={() => navigate(`${AR_INVOICE_PATH}/${invoice.id}`)}
                >
                  <ListCardRow label="Customer">{invoice.customerName}</ListCardRow>
                  <ListCardRow label="Input Date">{invoice.inputDate}</ListCardRow>
                  <ListCardRow label="Grand Total">{money(totals.total)} {invoice.currency}</ListCardRow>
                  <ListCardRow label="Unpaid">{money(totals.unpaid)} {invoice.currency}</ListCardRow>
                </ListCard>
              );
            })}
          </div>
        ) : <EmptyComponent />
      ) : (
        <DataGrid
          table={table}
          recordCount={rows.length}
          tableLayout={{ headerSticky: true, width: "auto" }}
          tableClassNames={{ bodyRow: "h-10" }}
          emptyMessage={<EmptyComponent />}
        >
          <DataGridContainer className="max-h-[calc(100vh-13rem)]">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      )}
    </div>
  );
}
