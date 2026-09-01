import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJournalVouchers } from "./use-journal-voucher";
import type { JournalVoucherStatus } from "@/types/journal-voucher";

const statusClass: Record<JournalVoucherStatus, string> = {
  draft: "bg-muted text-muted-foreground", submitted: "bg-amber-100 text-amber-900", posting: "bg-blue-100 text-blue-900", scheduled: "bg-violet-100 text-violet-900", posted: "bg-emerald-100 text-emerald-900", post_failed: "bg-red-100 text-red-900", voided: "bg-slate-200 text-slate-700", reversal_scheduled: "bg-violet-100 text-violet-900", reversed: "bg-slate-200 text-slate-700",
};

/** Live Journal Voucher list backed by the GL API. / รายการ JV ที่อ่านจาก GL API จริง */
export default function JournalVoucherList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JournalVoucherStatus | "">("");
  const query = useJournalVouchers({ perpage: 25, search, filter: status ? `jv_status:${status}` : undefined });
  const rows = query.data?.data ?? [];
  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Journal Voucher</h1><p className="text-muted-foreground text-sm">General Ledger entries, workflow and posting history</p></div>
        <Button onClick={() => navigate("/accounting/journal-voucher/new")}><Plus className="size-4" /> New JV</Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b"><CardTitle className="text-base">Journal Vouchers</CardTitle><Button variant="ghost" size="sm" onClick={() => query.refetch()}><RefreshCw className="size-4" /></Button></CardHeader>
        <CardContent className="space-y-3 pt-4"><div className="flex flex-wrap gap-2"><Input className="min-w-64 flex-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search JV number, description or source" /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as JournalVoucherStatus | "")} aria-label="Filter by status"><option value="">All statuses</option>{Object.keys(statusClass).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Number</th><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Source</th><th className="p-2">Status</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th></tr></thead><tbody>
            {query.isLoading && <tr><td colSpan={7} className="p-6 text-center">Loading…</td></tr>}
            {!query.isLoading && rows.length === 0 && <tr><td colSpan={7} className="text-muted-foreground p-6 text-center">No Journal Vouchers found</td></tr>}
            {rows.map((row) => <tr key={row.id} className="hover:bg-muted/50 cursor-pointer border-b" onClick={() => navigate(`/accounting/journal-voucher/${row.id}`)}><td className="p-2 font-medium">{row.display_no}</td><td className="p-2 tabular-nums">{new Date(row.jv_date ?? row.journal_date).toLocaleDateString()}</td><td className="max-w-72 truncate p-2">{row.description}</td><td className="p-2">{row.source_type ?? "Manual"}</td><td className="p-2"><Badge className={statusClass[row.jv_status]}>{row.jv_status}</Badge></td><td className="p-2 text-right tabular-nums">{row.total_debit}</td><td className="p-2 text-right tabular-nums">{row.total_credit}</td></tr>)}
          </tbody></table></div>
        </CardContent>
      </Card>
    </div>
  );
}
