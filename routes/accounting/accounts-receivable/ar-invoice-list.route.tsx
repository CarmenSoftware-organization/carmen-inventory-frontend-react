import { useMemo, useState } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Columns3, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { ListCard, ListCardRow } from "@/components/share/list-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CellAction } from "@/components/ui/cell-action";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDotBadge, type DotTone } from "@/components/ui/status-dot-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AR_INVOICES,
  AR_INVOICE_PATH,
  invoiceTotals,
  money,
  type ArInvoice,
  type ArDocumentType,
} from "./ar-invoice-model";

const statusTone: Record<ArInvoice["status"], DotTone> = {
  Draft: "neutral",
  Submitted: "warning",
  Approved: "info",
  Posted: "success",
  Void: "neutral",
};

const docTypeTone: Record<
  ArDocumentType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ARIV: "default",
  ARCN: "destructive",
  ARDN: "secondary",
  ARDP: "outline",
  ARRC: "secondary",
};

function InvoiceStatus({ status }: { status: ArInvoice["status"] }) {
  return (
    <StatusDotBadge tone={statusTone[status]} size="xs">
      {status}
    </StatusDotBadge>
  );
}

export function Component() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("ALL");
  const [sorting, setSorting] = useState<SortingState>([]);
  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return AR_INVOICES.filter((invoice) => {
      const matchesSearch =
        `${invoice.docNo} ${invoice.customerName} ${invoice.customerCode} ${invoice.sourceDoc} ${invoice.docType ?? ""}`
          .toLowerCase()
          .includes(term);
      const matchesType =
        docTypeFilter === "ALL" || invoice.docType === docTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [search, docTypeFilter]);
  const columns = useMemo<ColumnDef<ArInvoice>[]>(
    () => [
      {
        accessorKey: "docType",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={docTypeTone[row.original.docType ?? "ARIV"]}
            size="xs"
          >
            {row.original.docType ?? "ARIV"}
          </Badge>
        ),
        meta: { headerTitle: "Type" },
      },
      {
        accessorKey: "docNo",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Doc No." />
        ),
        cell: ({ row }) => (
          <CellAction
            onClick={() => navigate(`${AR_INVOICE_PATH}/${row.original.id}`)}
          >
            {row.original.docNo}
          </CellAction>
        ),
        enableHiding: false,
        meta: { headerTitle: "Doc No." },
      },
      {
        accessorKey: "inputDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Input Date" />
        ),
        meta: { headerTitle: "Input Date", cellClassName: "tabular-nums" },
      },
      {
        accessorKey: "customerName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Customer (AR)" />
        ),
        cell: ({ row }) => (
          <div>
            <span
              className="block max-w-56 truncate"
              title={row.original.customerName}
            >
              {row.original.customerName}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.customerCode}
            </span>
          </div>
        ),
        meta: { headerTitle: "Customer (AR)" },
      },
      {
        accessorKey: "source",
        header: "Source",
        meta: { headerTitle: "Source" },
      },
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
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {money(row.getValue<number>("total"))} {row.original.currency}
          </span>
        ),
        meta: {
          headerTitle: "Grand Total",
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
      {
        id: "unpaid",
        header: "Unpaid",
        accessorFn: (invoice) => invoiceTotals(invoice).unpaid,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {money(row.getValue<number>("unpaid"))} {row.original.currency}
          </span>
        ),
        meta: {
          headerTitle: "Unpaid",
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
    ],
    [navigate],
  );
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
        <DocumentListHeader
          title="AR Document Directory"
          description="Invoices, Credit/Debit Notes, Deposits & Receipts (FRD v1.07)"
          count={rows.length}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New Document{" "}
              <ChevronDown className="ml-1 size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(
              [
                ["ARIV", "Invoice (ARIV)", "Invoice"],
                ["ARCN", "Credit Note (ARCN)", "Credit Note"],
                ["ARDN", "Debit Note (ARDN)", "Debit Note"],
                ["ARDP", "Advance Deposit (ARDP)", "Deposit"],
                ["ARRC", "Official Receipt (ARRC)", "Receipt"],
              ] as const
            ).map(([type, label]) => (
              <DropdownMenuItem
                key={type}
                onSelect={() => navigate(`${AR_INVOICE_PATH}/new?type=${type}`)}
              >
                <Plus className="size-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-48 sm:w-60">
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {(["ALL", "ARIV", "ARCN", "ARDN", "ARDP", "ARRC"] as const).map(
              (t) => (
                <Button
                  key={t}
                  type="button"
                  variant={docTypeFilter === t ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setDocTypeFilter(t)}
                >
                  {t === "ALL" ? "All Types" : t}
                </Button>
              ),
            )}
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <DataGridSortMenu table={table} />
          <DataGridColumnVisibility
            table={table}
            trigger={
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Toggle columns"
              >
                <Columns3 className="size-4" />
              </Button>
            }
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
                  title={`${invoice.docType ?? "ARIV"} · ${invoice.docNo}`}
                  badge={<InvoiceStatus status={invoice.status} />}
                  onOpen={() => navigate(`${AR_INVOICE_PATH}/${invoice.id}`)}
                >
                  <ListCardRow label="Customer">
                    {invoice.customerName}
                  </ListCardRow>
                  <ListCardRow label="Input Date">
                    {invoice.inputDate}
                  </ListCardRow>
                  <ListCardRow label="Grand Total">
                    {money(totals.total)} {invoice.currency}
                  </ListCardRow>
                  <ListCardRow label="Unpaid">
                    {money(totals.unpaid)} {invoice.currency}
                  </ListCardRow>
                </ListCard>
              );
            })}
          </div>
        ) : (
          <EmptyComponent />
        )
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
