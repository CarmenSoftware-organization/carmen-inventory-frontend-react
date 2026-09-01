import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Check, Plus, RotateCcw, Save, Send, Trash2, Undo2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAccountCode } from "@/routes/config/account-code/use-account-code";
import { useCurrency } from "@/hooks/use-currency";
import { useDepartment } from "@/hooks/use-department";
import { useCreateJournalVoucher, useJournalVoucher, useJournalVoucherAction, useUpdateJournalVoucher } from "./use-journal-voucher";
import type { JournalVoucherInput, JournalVoucherLineInput } from "@/types/journal-voucher";

const emptyLine = (): JournalVoucherLineInput => ({ account_id: "", department_id: null, comment: "", currency_id: "", exchange_rate: "1", rate_date: null, rate_type: "spot", rate_source: "manual", debit: "0", credit: "0", dimension: [] });

function addDecimal(values: string[]): string {
  const scale = Math.max(0, ...values.map((value) => (value.split(".")[1] ?? "").length));
  const unit = 10n ** BigInt(scale);
  const total = values.reduce((sum, value) => { const [whole, fraction = ""] = value.split("."); return sum + BigInt(whole || "0") * unit + BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0"); }, 0n);
  const sign = total < 0n ? "-" : "";
  const digits = (total < 0n ? -total : total).toString().padStart(scale + 1, "0");
  return `${sign}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}

/** Journal Voucher editor using shared master-data hooks and exact decimal strings. / ฟอร์ม JV ที่ใช้ master เดิมและ decimal string */
export default function JournalVoucherForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const existing = useJournalVoucher(id);
  const accounts = useAccountCode({ perpage: -1 });
  const currencies = useCurrency({ perpage: -1 });
  const departments = useDepartment({ perpage: -1 });
  const create = useCreateJournalVoucher();
  const update = useUpdateJournalVoucher();
  const submit = useJournalVoucherAction("submit");
  const approve = useJournalVoucherAction("approve");
  const returnToDraft = useJournalVoucherAction("return-to-draft");
  const reject = useJournalVoucherAction("reject");
  const reverseAction = useJournalVoucherAction("reverse");
  const retryAction = useJournalVoucherAction("retry-post");
  const voidAction = useJournalVoucherAction("void");
  const loaded = existing.data;
  const editable = !loaded || loaded.jv_status === "draft";
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [prefix, setPrefix] = useState("JV");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [functionalCurrency, setFunctionalCurrency] = useState("");
  const [schedulePost, setSchedulePost] = useState(false);
  const [scheduledPostAt, setScheduledPostAt] = useState("");
  const [autoReverse, setAutoReverse] = useState(false);
  const [reverseDate, setReverseDate] = useState("");
  const [lines, setLines] = useState<JournalVoucherLineInput[]>([emptyLine(), emptyLine()]);

  useEffect(() => {
    if (!loaded) return;
    setDate((loaded.jv_date ?? loaded.journal_date).slice(0, 10)); setPrefix(loaded.prefix); setDescription(loaded.description); setNote(loaded.note ?? ""); setFunctionalCurrency(loaded.base_currency_id); setSchedulePost(loaded.schedule_post); setScheduledPostAt(loaded.scheduled_post_at?.slice(0, 16) ?? ""); setAutoReverse(loaded.auto_reverse); setReverseDate(loaded.reverse_date?.slice(0, 10) ?? "");
    setLines(loaded.lines.map(({ id: _id, sequence_no: _sequence, account_code: _accountCode, account_name: _accountName, department_code: _departmentCode, department_name: _departmentName, currency_code: _currencyCode, base_debit: _baseDebit, base_credit: _baseCredit, ...line }) => line));
  }, [loaded]);

  const currencyId = functionalCurrency || loaded?.base_currency_id || currencies.data?.data?.[0]?.id || "";
  const debit = useMemo(() => addDecimal(lines.map((line) => line.debit || "0")), [lines]);
  const credit = useMemo(() => addDecimal(lines.map((line) => line.credit || "0")), [lines]);
  const setLine = (index: number, patch: Partial<JournalVoucherLineInput>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const payload = (): JournalVoucherInput => ({ journal_type: "general", prefix, journal_date: new Date(date).toISOString(), description, note: note || null, functional_currency_id: currencyId, source_type: "manual", source_id: null, source_no: null, schedule_post: schedulePost, scheduled_post_at: schedulePost && scheduledPostAt ? new Date(scheduledPostAt).toISOString() : null, auto_reverse: autoReverse, reverse_date: autoReverse && reverseDate ? new Date(reverseDate).toISOString() : null, lines: lines.map((line) => ({ ...line, currency_id: line.currency_id || currencyId, exchange_rate: line.currency_id === currencyId ? "1" : line.exchange_rate })) });
  const save = async () => { try { if (id && id !== "new" && loaded) await update.mutateAsync({ id, doc_version: loaded.doc_version, ...payload() }); else await create.mutateAsync(payload()); toast.success("Journal Voucher saved"); navigate("/accounting/journal-voucher"); } catch { /* normalized mutation error is shown globally */ } };
  const submitDraft = async () => { try { let target = id; let version = loaded?.doc_version ?? 0; if (!target || target === "new") { const result = await create.mutateAsync(payload()); target = result.data.id; version = result.data.doc_version; } await submit.mutateAsync({ id: target, doc_version: version }); toast.success("Journal Voucher submitted"); navigate(`/accounting/journal-voucher/${target}`); } catch { /* normalized mutation error is shown globally */ } };
  const runAction = async (action: "reverse" | "retry-post" | "void") => { if (!loaded) return; try { await (action === "reverse" ? reverseAction : action === "retry-post" ? retryAction : voidAction).mutateAsync({ id: loaded.id, doc_version: loaded.doc_version, reason: action === "void" ? "Voided by user" : action === "reverse" ? "Manual reversal" : undefined, reverse_date: action === "reverse" ? new Date().toISOString() : undefined, idempotency_key: action === "retry-post" ? `retry:${loaded.id}:${Date.now()}` : undefined }); toast.success(`${action} completed`); } catch { /* normalized mutation error is shown globally */ } };
  const workflowAction = async (action: "approve" | "return-to-draft" | "reject") => { if (!loaded) return; try { await (action === "approve" ? approve : action === "return-to-draft" ? returnToDraft : reject).mutateAsync({ id: loaded.id, doc_version: loaded.doc_version, reason: action === "reject" ? "Rejected by user" : undefined }); toast.success(`${action} completed`); } catch { /* normalized mutation error is shown globally */ } };
  if (existing.isLoading) return <div>Loading…</div>;
  return <div className="space-y-4 pb-10">
    {loaded?.workflow_enabled_snapshot && loaded.jv_status === "submitted" && <div className="flex flex-wrap gap-2 rounded-md border bg-muted/30 p-3"><Button variant="outline" onClick={() => workflowAction("approve")}><Check className="size-4" /> Approve</Button><Button variant="ghost" onClick={() => workflowAction("return-to-draft")}><Undo2 className="size-4" /> Return to draft</Button><Button variant="ghost" onClick={() => workflowAction("reject")}><X className="size-4" /> Reject</Button></div>}
    <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={() => navigate("/accounting/journal-voucher")}><ArrowLeft className="size-4" /> Journal Vouchers</Button><div className="flex flex-wrap gap-2">{loaded?.jv_status === "posted" && <Button variant="outline" onClick={() => runAction("reverse")}><RotateCcw className="size-4" /> Reverse</Button>}{loaded?.jv_status === "post_failed" && <Button variant="outline" onClick={() => runAction("retry-post")}><RotateCcw className="size-4" /> Retry post</Button>}{loaded && ["draft", "submitted", "scheduled", "post_failed"].includes(loaded.jv_status) && <Button variant="ghost" onClick={() => runAction("void")}><Ban className="size-4" /> Void</Button>}<Button variant="outline" disabled={!editable || create.isPending || update.isPending} onClick={save}><Save className="size-4" /> Save draft</Button><Button disabled={!editable || submit.isPending} onClick={submitDraft}><Send className="size-4" /> Submit</Button></div></div>
    {!editable && <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">This Journal Voucher is {loaded?.jv_status} and is read-only.</div>}
    <Card><CardHeader><CardTitle>{loaded?.display_no ?? "New Journal Voucher"}</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4"><label className="space-y-1 text-sm">Prefix<select disabled={!editable} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={prefix} onChange={(event) => setPrefix(event.target.value)}><option value="JV">JV — Journal</option><option value="AD">AD — Adjustment</option></select></label><label className="space-y-1 text-sm">JV date<Input disabled={!editable} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="space-y-1 text-sm">Functional currency<select disabled={!editable} className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm" value={currencyId} onChange={(event) => setFunctionalCurrency(event.target.value)}><option value="">Select currency</option>{currencies.data?.data?.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label><label className="space-y-1 text-sm">Description<Input disabled={!editable} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div>
      <label className="space-y-1 text-sm">Note<Textarea disabled={!editable} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-4 text-sm"><label><input disabled={!editable} type="checkbox" checked={schedulePost} onChange={(event) => setSchedulePost(event.target.checked)} /> Schedule post</label>{schedulePost && <Input disabled={!editable} className="w-auto" type="datetime-local" value={scheduledPostAt} onChange={(event) => setScheduledPostAt(event.target.value)} />}<label><input disabled={!editable} type="checkbox" checked={autoReverse} onChange={(event) => setAutoReverse(event.target.checked)} /> Auto-reverse</label>{autoReverse && <Input disabled={!editable} className="w-auto" type="date" value={reverseDate} onChange={(event) => setReverseDate(event.target.value)} />}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead><tr className="border-b text-left"><th className="p-2">Account</th><th className="p-2">Department</th><th className="p-2">Currency / rate</th><th className="p-2">Comment</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th /></tr></thead><tbody>{lines.map((line, index) => <tr key={index} className="border-b"><td className="p-2"><select disabled={!editable} className="border-input bg-background h-9 w-full rounded-md border px-2" value={line.account_id} onChange={(event) => setLine(index, { account_id: event.target.value })}><option value="">Select account</option>{accounts.data?.data?.filter((item) => item.is_active && item.type !== "header").map((item) => <option key={item.id} value={item.id}>{item.code} — {item.description_1}</option>)}</select></td><td className="p-2"><select disabled={!editable} className="border-input bg-background h-9 w-full rounded-md border px-2" value={line.department_id ?? ""} onChange={(event) => setLine(index, { department_id: event.target.value || null })}><option value="">—</option>{departments.data?.data?.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></td><td className="p-2"><div className="flex gap-1"><select disabled={!editable} className="border-input bg-background h-9 w-24 rounded-md border px-2" value={line.currency_id || currencyId} onChange={(event) => setLine(index, { currency_id: event.target.value, exchange_rate: event.target.value === currencyId ? "1" : line.exchange_rate })}><option value="">—</option>{currencies.data?.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><Input disabled={!editable || line.currency_id === currencyId} className="w-24" inputMode="decimal" value={line.currency_id === currencyId ? "1" : line.exchange_rate} onChange={(event) => setLine(index, { exchange_rate: event.target.value })} /></div></td><td className="p-2"><Input disabled={!editable} value={line.comment ?? ""} onChange={(event) => setLine(index, { comment: event.target.value })} /></td><td className="p-2"><Input disabled={!editable} className="text-right" inputMode="decimal" value={line.debit} onChange={(event) => setLine(index, { debit: event.target.value, credit: "0" })} /></td><td className="p-2"><Input disabled={!editable} className="text-right" inputMode="decimal" value={line.credit} onChange={(event) => setLine(index, { credit: event.target.value, debit: "0" })} /></td><td className="p-2"><Button disabled={!editable} variant="ghost" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>
      <Button disabled={!editable} variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])}><Plus className="size-4" /> Add line</Button><div className="flex justify-end gap-8 border-t pt-3 text-sm font-medium"><span>Debit: {debit}</span><span>Credit: {credit}</span><span className={debit === credit ? "text-emerald-600" : "text-red-600"}>{debit === credit ? "Balanced" : "Not balanced"}</span></div>
    </CardContent></Card>
  </div>;
}
