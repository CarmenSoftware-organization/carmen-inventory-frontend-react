import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Settings2, Plus, RefreshCw, Columns3, LayoutGrid, LayoutList } from "lucide-react";
import { useNavigate } from "react-router";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { DataGridSortMenu } from "@/components/ui/data-grid/data-grid-sort-menu";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/search-input";
import { StatusFilter } from "@/components/ui/status-filter";
import { useJournalVouchers } from "./use-journal-voucher";
import type { JournalVoucher, JournalVoucherStatus } from "@/types/journal-voucher";
import { ListCard, ListCardRow } from "@/components/share/list-card";

const statuses: JournalVoucherStatus[] = ["draft", "submitted", "posting", "scheduled", "posted", "post_failed", "voided", "reversed"];
const statusClass: Record<string, string> = { draft: "bg-muted text-muted-foreground", submitted: "bg-amber-100 text-amber-900", posted: "bg-emerald-100 text-emerald-900", post_failed: "bg-red-100 text-red-900", reversed: "bg-slate-200 text-slate-700" };

export default function JournalVoucherList() {
  const navigate = useNavigate(); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const query = useJournalVouchers({ perpage: 25, search, filter: status ? `status:${status}` : undefined }); const rows = query.data?.data ?? [];
  const columns = useMemo<ColumnDef<JournalVoucher>[]>(() => [
    { accessorKey: "display_no", header: ({ column }) => <DataGridColumnHeader column={column} title="Number" />, cell: ({ row }) => <CellAction onClick={() => navigate(`/accounting/journal-voucher/${row.original.id}`)}>{row.original.display_no}</CellAction>, enableHiding: false, meta: { headerTitle: "Number" } },
    { accessorKey: "jv_date", header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />, cell: ({ row }) => <span className="tabular-nums">{row.original.jv_date.slice(0, 10)}</span>, meta: { headerTitle: "Date" } },
    { accessorKey: "description", header: ({ column }) => <DataGridColumnHeader column={column} title="Description" />, cell: ({ row }) => <span className="block max-w-80 truncate" title={row.original.description}>{row.original.description}</span>, meta: { headerTitle: "Description" } },
    { accessorKey: "source_type", header: "Source", cell: ({ row }) => row.original.source_type ?? "Manual", meta: { headerTitle: "Source" } },
    { accessorKey: "jv_status", header: "Status", cell: ({ row }) => <Badge size="xs" className={statusClass[row.original.jv_status] ?? "bg-muted"}>{row.original.jv_status.replaceAll("_", " ")}</Badge>, meta: { headerTitle: "Status" } },
    { accessorKey: "total_debit", header: "Debit", cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.total_debit}</span>, meta: { headerTitle: "Debit", cellClassName: "text-right" } },
    { accessorKey: "total_credit", header: "Credit", cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.total_credit}</span>, meta: { headerTitle: "Credit", cellClassName: "text-right" } },
  ], [navigate]);
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  return <div className="space-y-3 pb-8"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><DocumentListHeader title="Journal Voucher" description="General Ledger entries, workflow and posting history" /><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate("/accounting/settings")}><Settings2 className="size-4" /> Settings</Button><Button size="sm" onClick={() => navigate("/accounting/journal-voucher/new")}><Plus className="size-4" /> New JV</Button></div></div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex w-full flex-1 items-center gap-2 sm:w-auto"><SearchInput defaultValue={search} onSearch={setSearch} onInputChange={setSearch} /><span className="bg-border hidden h-4 w-px sm:block" /><StatusFilter value={status} onChange={setStatus} placeholder="Status" defaultLabel="All statuses" options={statuses.map((item) => ({ value: item, label: item.replaceAll("_", " ") }))} className="w-36 text-xs" /></div><div className="hidden shrink-0 items-center gap-2 sm:flex"><DataGridSortMenu table={table} />{displayMode === "list" && <DataGridColumnVisibility table={table} trigger={<Button size="icon-sm" variant="outline" aria-label="Toggle columns"><Columns3 className="size-4" /></Button>} />}<div className="flex items-center rounded-md border"><Button size="icon-sm" variant={displayMode === "list" ? "secondary" : "ghost"} onClick={() => setDisplayMode("list")} aria-label="List view"><LayoutList className="size-4" /></Button><Button size="icon-sm" variant={displayMode === "grid" ? "secondary" : "ghost"} onClick={() => setDisplayMode("grid")} aria-label="Grid view"><LayoutGrid className="size-4" /></Button></div><Button variant="ghost" size="icon-sm" onClick={() => query.refetch()} aria-label="Refresh"><RefreshCw className="size-4" /></Button></div></div>{displayMode === "list" ? <DataGrid table={table} recordCount={rows.length} tableLayout={{ headerSticky: true, width: "auto" }} tableClassNames={{ bodyRow: "h-10" }}><DataGridContainer className="max-h-[calc(100vh-12rem)]"><DataGridTable /></DataGridContainer></DataGrid> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row) => <ListCard key={row.id} title={row.display_no} badge={<Badge size="xs" className={statusClass[row.jv_status] ?? "bg-muted"}>{row.jv_status}</Badge>} onOpen={() => navigate(`/accounting/journal-voucher/${row.id}`)}><ListCardRow label="Date">{row.jv_date.slice(0, 10)}</ListCardRow><ListCardRow label="Description">{row.description}</ListCardRow><ListCardRow label="Total">{row.total_debit}</ListCardRow></ListCard>)}</div>}</div>;
}
