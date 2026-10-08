import type { ReactNode } from "react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { SummaryBar } from "@/components/ui/summary-bar";
import {
  invoiceTotals,
  lineTotals,
  lineUnpaid,
  money,
  type ArInvoice,
} from "./ar-invoice-model";

type TableRow = { id: string; cells: ReactNode[] };

function InvoiceTable({
  headers,
  rows,
  numericColumns,
  emptyMessage,
}: {
  headers: string[];
  rows: TableRow[];
  numericColumns: number[];
  emptyMessage?: string;
}) {
  "use no memo";
  const columns: ColumnDef<TableRow>[] = headers.map((header, index) => ({
    id: String(index),
    header,
    cell: ({ row }) => row.original.cells[index],
    meta: numericColumns.includes(index)
      ? {
          headerClassName: "text-right",
          cellClassName: "text-right tabular-nums whitespace-nowrap",
        }
      : undefined,
  }));
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      emptyMessage={emptyMessage}
      tableLayout={{
        width: "auto",
        headerSticky: true,
        rowClamp: false,
        cellAlign: "top",
      }}
    >
      <DataGridContainer border={false} scroll>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

export function ArInvoiceItemsTable({
  invoice,
  editable,
  onDetail,
  onRemove,
}: {
  invoice: ArInvoice;
  editable: boolean;
  onDetail: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const rows = invoice.lines.map((line, index) => {
    const amounts = lineTotals(line);
    return {
      id: line.id,
      cells: [
        index + 1,
        <div>
          <span className="font-medium">{line.description || "New item"}</span>
          <span className="text-muted-foreground block">
            {line.account} · Dept {line.costCenter} · {line.reference}
          </span>
        </div>,
        line.unit,
        line.quantity,
        money(line.unitPrice),
        money(amounts.subtotal),
        money(line.discount),
        money(amounts.net),
        <div>
          {money(amounts.tax)}
          <span className="text-muted-foreground block">
            VAT {line.taxRate}%
          </span>
        </div>,
        <div>
          {money(amounts.total)}
          <span className="text-warning-ink block">
            Unpaid {money(lineUnpaid(invoice, index))}
          </span>
        </div>,
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onDetail(index)}>
            Detail
          </Button>
          {editable && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>,
      ],
    };
  });
  return (
    <InvoiceTable
      headers={[
        "#",
        "Description / Comment",
        "Unit",
        "Quantity",
        "Price / Unit",
        "Subtotal",
        "Discount",
        "Net Amount",
        "Tax",
        "Total / Unpaid",
        "Action",
      ]}
      rows={rows}
      numericColumns={[3, 4, 5, 6, 7, 8, 9]}
      emptyMessage="Add an invoice item or PMS folio."
    />
  );
}

export function ArInvoiceTaxTable({ invoice }: { invoice: ArInvoice }) {
  const rate = invoice.exchangeRate;
  const totals = invoiceTotals(invoice);
  const rows = invoice.lines.flatMap((line, index) => {
    const amounts = lineTotals(line);
    const taxRows = [
      {
        id: `${line.id}-tax1`,
        cells: [
          index + 1,
          line.taxRate ? "VAT07_ADD" : "NONE",
          line.description,
          money(amounts.net * rate),
          `${line.taxRate}%`,
          money(amounts.tax1 * rate),
          money((amounts.net + amounts.tax1) * rate),
        ],
      },
    ];
    if (line.tax2Rate > 0)
      taxRows.push({
        id: `${line.id}-tax2`,
        cells: [
          `${index + 1}.2`,
          "TAX2",
          `${line.description} · additional tax`,
          money(amounts.net * rate),
          `${line.tax2Rate}%`,
          money(amounts.tax2 * rate),
          money((amounts.net + amounts.tax2) * rate),
        ],
      });
    return taxRows;
  });
  return (
    <>
      <InvoiceTable
        headers={[
          "#",
          "Tax Profile",
          "Tax Type / Description",
          "Base Amount (THB)",
          "Rate",
          "Tax Amount (THB)",
          "Total (THB)",
        ]}
        rows={rows}
        numericColumns={[3, 4, 5, 6]}
      />
      <SummaryBar
        items={[
          {
            key: "net",
            label: "Base Amount (THB)",
            value: money(totals.net * rate),
          },
          {
            key: "tax",
            label: "Tax Amount (THB)",
            value: money(totals.tax * rate),
          },
          {
            key: "total",
            label: "Total (THB)",
            value: money(totals.total * rate),
            emphasis: true,
          },
        ]}
      />
    </>
  );
}

export function ArInvoiceJournalTable({ invoice }: { invoice: ArInvoice }) {
  const totals = invoiceTotals(invoice);
  const rate = invoice.exchangeRate;
  const first = invoice.lines[0];
  const rows: TableRow[] = [
    {
      id: "ar",
      cells: [
        1,
        `${first?.arAccount ?? "1130000"} · Trade Accounts Receivable`,
        first?.arCostCenter ?? "GEN",
        "Full invoice",
        invoice.currency,
        rate.toFixed(5),
        money(totals.total * rate),
        "—",
      ],
    },
  ];
  invoice.lines.forEach((line, index) =>
    rows.push({
      id: line.id,
      cells: [
        index + 2,
        <div>
          {line.account} · Revenue
          <span className="text-muted-foreground block">
            {line.dimensions ||
              "Market · Sales · Project · Event · Location · Channel: —"}
          </span>
        </div>,
        line.costCenter,
        line.description,
        invoice.currency,
        rate.toFixed(5),
        "—",
        money(lineTotals(line).net * rate),
      ],
    }),
  );
  if (totals.tax1 > 0)
    rows.push({
      id: "tax1",
      cells: [
        rows.length + 1,
        `${first?.tax1Account ?? "2151000"} · Output VAT Pending`,
        first?.tax1CostCenter ?? "GEN",
        "Output tax",
        invoice.currency,
        rate.toFixed(5),
        "—",
        money(totals.tax1 * rate),
      ],
    });
  if (totals.tax2 > 0)
    rows.push({
      id: "tax2",
      cells: [
        rows.length + 1,
        `${first?.tax2Account ?? "2180000"} · Additional Output Tax`,
        first?.tax2CostCenter ?? "GEN",
        "Additional tax",
        invoice.currency,
        rate.toFixed(5),
        "—",
        money(totals.tax2 * rate),
      ],
    });
  return (
    <InvoiceTable
      headers={[
        "#",
        "Account Code",
        "Cost Center",
        "Comment",
        "Currency",
        "Rate",
        "Debit",
        "Credit",
      ]}
      rows={rows}
      numericColumns={[5, 6, 7]}
    />
  );
}
