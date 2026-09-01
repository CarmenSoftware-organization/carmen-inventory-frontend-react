import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { MOCK_SETTINGS_KEY } from "./journal-voucher/use-journal-voucher";

export default function AccountingSettingsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"standard" | "strict">(() => window.localStorage.getItem(MOCK_SETTINGS_KEY) === "standard" ? "standard" : "strict");
  const save = () => { window.localStorage.setItem(MOCK_SETTINGS_KEY, mode); navigate("/accounting/journal-voucher"); };
  return <div className="space-y-4 pb-8"><div className="flex items-center justify-between"><DocumentListHeader title="Accounting Settings" description="Configure General Ledger processing for the current Business Unit" /><Button variant="outline" size="sm" onClick={() => navigate(-1)}>Back</Button></div><Card><CardHeader><CardTitle className="text-base">Journal processing</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium" htmlFor="journal-mode">Journal Staging mode</label><select id="journal-mode" className="mt-1 h-9 w-full max-w-md rounded-md border bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as "standard" | "strict")}><option value="standard">Standard, send validated events directly to JV</option><option value="strict">Strict, review events in Journal Staging first</option></select><p className="mt-2 max-w-xl text-sm text-muted-foreground">Standard hides the Journal Staging menu. Strict enables the staging workbench before a Journal Voucher is generated.</p></div><Button size="sm" onClick={save}>Save settings</Button></CardContent></Card><p className="text-xs text-muted-foreground">Mockup setting only. The value is stored in this browser until backend configuration is connected.</p></div>;
}
