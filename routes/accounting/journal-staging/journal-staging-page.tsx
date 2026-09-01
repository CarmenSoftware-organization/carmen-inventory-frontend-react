import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBuCode } from "@/hooks/use-bu-code";
import { toast } from "sonner";
import { useJournalStagingBatches, useProcessJournalStagingBatch, useCreateJournalStagingBatch, useGenerateJournalStagingBatch } from "./use-journal-staging";
import { useJournalVoucherSettings } from "../journal-voucher/use-journal-voucher";

export default function JournalStagingPage() {
  const buCode = useBuCode();
  const [status, setStatus] = useState("");
  const [sourceChannel, setSourceChannel] = useState("api");
  const [periodId, setPeriodId] = useState("");
  const [payload, setPayload] = useState("[{\"source_type\":\"manual\",\"idempotency_key\":\"evt-1\",\"journal_group_key\":\"manual-1\",\"original_payload\":{}}]");
  const createBatch = useCreateJournalStagingBatch();
  const settings = useJournalVoucherSettings();
  const query = useJournalStagingBatches({ perpage: 25, filter: status ? `status:${status}` : undefined });
  const processBatch = useProcessJournalStagingBatch();
  const generateBatch = useGenerateJournalStagingBatch();
  const rows = query.data?.data ?? [];
  const busy = processBatch.isPending || generateBatch.isPending;
  const create = async () => { if (!periodId.trim()) return; try { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(periodId.trim())) { toast.error("Accounting period ID must be a valid UUID"); return; } const records = JSON.parse(payload) as unknown; if (!Array.isArray(records) || records.length === 0) { toast.error("Records JSON must be a non-empty array"); return; } await createBatch.mutateAsync({ source_channel: sourceChannel, accounting_period_id: periodId.trim(), records }); setPayload("[]"); await query.refetch(); } catch { toast.error("Records JSON is invalid"); } };
  if (!settings.isLoading && settings.data?.journal_staging_mode !== "strict") return <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">Journal Staging Workbench is hidden because this BU is using standard mode. Enable strict mode in Accounting Settings to access it.</div>;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Journal Staging <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Mockup mode</span></h1>
        <p className="text-sm text-muted-foreground">Review accounting event batches before generating Journal Vouchers.</p>
        <div className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-[140px_1fr]"><label className="text-sm" htmlFor="staging-source">Source channel</label><input id="staging-source" className="h-9 rounded-md border bg-background px-2 text-sm" value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value)} /><label className="text-sm" htmlFor="staging-period">Accounting period ID</label><input id="staging-period" className="h-9 rounded-md border bg-background px-2 text-sm" value={periodId} onChange={(event) => setPeriodId(event.target.value)} placeholder="UUID" /><label className="text-sm" htmlFor="staging-payload">Records JSON</label><textarea id="staging-payload" className="min-h-20 rounded-md border bg-background p-2 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)} /><div /><Button className="w-fit" size="sm" disabled={!buCode || createBatch.isPending || !periodId.trim()} onClick={create}>Create staging batch</Button></div>
        <select className="mt-2 h-9 rounded-md border bg-background px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter staging batch status"><option value="">All statuses</option>{["received", "queued", "processing", "validation_failed", "ready", "partially_completed", "completed", "cancelled"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-base">Batches</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => query.refetch()}><RefreshCw className="size-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">Batch</th><th className="p-2">Source</th><th className="p-2">Status</th><th className="p-2 text-right">Records</th><th className="p-2 text-right">JVs</th><th className="p-2 text-right">Lines</th><th className="p-2">Action</th></tr></thead>
              <tbody>
                {query.isLoading && <tr><td colSpan={7} className="p-6 text-center">Loading…</td></tr>}
                {!query.isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No staging batches found</td></tr>}
                {rows.map((row) => {
                  const ready = row.status === "ready" || row.status === "partially_completed";
                  const terminal = ["completed", "cancelled", "validation_failed"].includes(row.status);
                  return <tr key={row.id} className="border-b"><td className="p-2 font-medium">{row.batch_no}</td><td className="p-2">{row.source_channel}</td><td className="p-2">{row.status}</td><td className="p-2 text-right">{row.total_records}</td><td className="p-2 text-right">{row.total_jvs}</td><td className="p-2 text-right">{row.total_lines}</td><td className="p-2"><Button size="sm" variant="outline" disabled={!buCode || busy || terminal} onClick={() => ready ? generateBatch.mutate(row.id) : processBatch.mutate(row.id)}>{ready ? "Generate JV" : "Process"}</Button></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

