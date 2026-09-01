import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { SettingSection } from "@/components/ui/setting-section";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_SETTINGS_KEY } from "./journal-voucher/use-journal-voucher";

export default function AccountingSettingsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"standard" | "strict">(() => window.localStorage.getItem(MOCK_SETTINGS_KEY) === "standard" ? "standard" : "strict");
  const save = () => { window.localStorage.setItem(MOCK_SETTINGS_KEY, mode); navigate("/accounting/journal-voucher"); };
  return <div className="flex w-full min-w-0 flex-col gap-4 pb-8"><header className="flex flex-wrap items-center justify-between gap-2"><DocumentListHeader title="Accounting Settings" description="Configure General Ledger processing for the current Business Unit" /><Button variant="outline" size="sm" onClick={() => navigate(-1)}>Back</Button></header><SettingSection first title="Journal processing" description="Choose how accounting events become Journal Vouchers."><Field className="sm:col-span-2"><FieldLabel htmlFor="journal-mode">Journal Staging mode</FieldLabel><Select value={mode} onValueChange={(value) => setMode(value as "standard" | "strict")}><SelectTrigger id="journal-mode" size="sm" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="strict">Strict</SelectItem></SelectContent></Select><p className="text-muted-foreground mt-1 text-xs">Standard sends validated events directly to JV. Strict shows Journal Staging for review before generating JV.</p></Field><Field><FieldLabel>Current behavior</FieldLabel><FieldPlainText>{mode === "strict" ? "Journal Staging is visible" : "Journal Staging is hidden"}</FieldPlainText></Field></SettingSection><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => navigate(-1)}>Cancel</Button><Button size="sm" onClick={save}>Save settings</Button></div><p className="text-muted-foreground text-xs">Mockup setting only. Stored in this browser until backend configuration is connected.</p></div>;
}




