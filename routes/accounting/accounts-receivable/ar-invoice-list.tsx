import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ListPageShell } from "@/components/share/list-page-shell";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SearchInput from "@/components/search-input";
import {
  AR_INVOICES,
  AR_INVOICE_PATH,
  invoiceTotals,
  money,
} from "./ar-invoice-model";

export default function ArInvoiceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      AR_INVOICES.filter((invoice) =>
        `${invoice.docNo} ${invoice.customerName} ${invoice.sourceDoc}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <ListPageShell
      title="AR Invoice"
      description="City ledger and customer invoices"
      count={rows.length}
      actions={
        <DocumentListActions
          onAdd={() => navigate(`${AR_INVOICE_PATH}/new`)}
          addLabel="New Invoice"
          hideExportPrint
        />
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:flex-initial">
            <SearchInput
              defaultValue={search}
              onSearch={setSearch}
              onInputChange={setSearch}
            />
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Doc No.</th>
              <th className="px-3 py-2">Input Date</th>
              <th className="px-3 py-2">Customer (AR)</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Grand Total</th>
              <th className="px-3 py-2 text-right">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => {
              const totals = invoiceTotals(invoice);
              return (
                <tr key={invoice.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() =>
                        navigate(`${AR_INVOICE_PATH}/${invoice.id}`)
                      }
                    >
                      {invoice.docNo}
                    </Button>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {invoice.inputDate}
                  </td>
                  <td className="px-3 py-3">
                    {invoice.customerName}
                    <span className="text-muted-foreground block text-xs">
                      {invoice.customerCode}
                    </span>
                  </td>
                  <td className="px-3 py-3">{invoice.source}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{invoice.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(totals.total)} {invoice.currency}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(totals.unpaid)} {invoice.currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No invoices found
          </p>
        )}
      </div>
    </ListPageShell>
  );
}
