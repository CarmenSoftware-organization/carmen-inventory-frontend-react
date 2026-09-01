import { useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

export interface JournalStagingBatch { id: string; batch_no: string; source_channel: string; status: string; total_records: number; total_jvs: number; total_lines: number; }
let batches: JournalStagingBatch[] = [
  { id: "mock-batch-001", batch_no: "STG-2026-0001", source_channel: "inventory", status: "ready", total_records: 24, total_jvs: 8, total_lines: 32 },
  { id: "mock-batch-002", batch_no: "STG-2026-0002", source_channel: "api", status: "queued", total_records: 12, total_jvs: 0, total_lines: 0 },
];
const response = (data: unknown) => Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }));
export function useJournalStagingBatches(params?: ParamsDto) { return useQuery<PaginatedResponse<JournalStagingBatch>>({ queryKey: ["journal-staging-batches", "mock", params], queryFn: async () => { const filter = String(params?.filter ?? ""); const status = filter.startsWith("status:") ? filter.slice(7) : ""; const data = batches.filter((item) => !status || item.status === status); return { data, paginate: { page: 1, perpage: data.length, total: data.length, pages: 1 } } as PaginatedResponse<JournalStagingBatch>; } }); }
export function useCreateJournalStagingBatch() { return useApiMutation<{ source_channel: string; accounting_period_id: string; records: unknown[] }, { data: JournalStagingBatch }>({ mutationFn: ({ source_channel, records }) => { const item = { id: `mock-batch-${Date.now()}`, batch_no: `STG-2026-${String(batches.length + 1).padStart(4, "0")}`, source_channel, status: "received", total_records: records.length, total_jvs: 0, total_lines: 0 }; batches = [item, ...batches]; return response({ data: item }); }, invalidateKeys: ["journal-staging-batches"] }); }
export function useProcessJournalStagingBatch() { return useApiMutation<string, { data: JournalStagingBatch }>({ mutationFn: (id) => { const item = batches.find((row) => row.id === id); if (item) item.status = "ready"; return response({ data: item }); }, invalidateKeys: ["journal-staging-batches"] }); }
export function useGenerateJournalStagingBatch() { return useApiMutation<string, { data: JournalStagingBatch }>({ mutationFn: (id) => { const item = batches.find((row) => row.id === id); if (item) { item.status = "completed"; item.total_jvs = Math.max(item.total_jvs, item.total_records); item.total_lines = item.total_jvs * 2; } return response({ data: item }); }, invalidateKeys: ["journal-staging-batches"] }); }


