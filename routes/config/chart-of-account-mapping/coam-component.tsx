import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { Download, Link2, Pencil, ScanLine, Upload } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListPageShell } from "@/components/share/list-page-shell";
import EmptyComponent from "@/components/empty-component";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import SearchInput from "@/components/search-input";
import type { AccountMappingRow } from "@/types/chart-of-account-mapping";
import { COAM_MOCK_ROWS } from "./coam-mock";
import { useCoamTable } from "./use-coam-table";

const matches = (row: AccountMappingRow, term: string) => {
  const haystack = [
    row.business_unit,
    row.store_location.code,
    row.store_location.name,
    row.category.code,
    row.category.name,
    row.sub_category.code,
    row.sub_category.name,
    row.item_group.code,
    row.item_group.name,
    row.department.code,
    row.department.name,
    row.account_code.code,
    row.account_code.name,
    row.mapping_type,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
};

function AmTable({ rows, onView }: { readonly rows: AccountMappingRow[]; readonly onView: (row: AccountMappingRow) => void }) {
  "use no memo";
  const table = useCoamTable({ data: rows, onView });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      emptyMessage={<EmptyComponent />}
      tableLayout={{
        headerSticky: true,
        // คอลัมน์เยอะ — ให้ตารางกว้างตาม size ที่ประกาศไว้แล้วเลื่อนแนวนอนเอา
        // ไม่ใช่บีบทุกช่องให้พอดีจอจนอ่านไม่ออก (เหมือน list ของ PR/PO)
        columnsResizable: true,
      }}
    >
      <DataGridContainer scroll>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

export default function CoamComponent() {
  "use no memo";
  const t = useTranslations("config.chartOfAccountMapping");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const [detail, setDetail] = useState<AccountMappingRow | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"AP" | "GL">("AP");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return COAM_MOCK_ROWS;
    return COAM_MOCK_ROWS.filter((row) => matches(row, term));
  }, [search]);

  // แยกไว้ก่อน render ทั้งสองชุด เพื่อให้ตัวเลขบนหัวแท็บตรงกับที่อยู่ในตารางเสมอ
  // แม้ตอนกำลังค้นหา (คนจะได้รู้ว่าอีกแท็บมีผลลัพธ์รออยู่ไหม โดยไม่ต้องกดสลับไปดู)
  const apRows = useMemo(
    () => rows.filter((row) => row.mapping_type === "AP"),
    [rows],
  );
  const glRows = useMemo(
    () => rows.filter((row) => row.mapping_type === "GL"),
    [rows],
  );

  return (
    <ListPageShell
      title={t("title")}
      description={t("desc")}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:flex-initial">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
        </div>
      }
      actions={
        // ยังไม่ผูก handler — วาง UI ไว้ก่อนตามที่ตกลง กดแล้วยังไม่มีอะไรเกิดขึ้น
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button type="button" size="sm" variant="outline">
            <Upload />
            {t("import")}
          </Button>
          <Button type="button" size="sm" variant="outline">
            <Download />
            {t("export")}
          </Button>
          <Button type="button" size="sm" variant="outline">
            <ScanLine />
            {t("scanForNewCode")}
          </Button>
          <Button type="button" size="sm" variant="outline">
            <Link2 />
            {t("bulkMap")}
          </Button>
          <Button type="button" size="sm">
            <Pencil />
            {tc("edit")}
          </Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "AP" | "GL")}>
        <TabsList variant="line">
          <TabsTrigger value="AP">
            {t("tabAp")}
            <span className="text-muted-foreground ms-1.5 tabular-nums">
              {apRows.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="GL">
            {t("tabGl")}
            <span className="text-muted-foreground ms-1.5 tabular-nums">
              {glRows.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="AP">
          <AmTable rows={apRows} onView={setDetail} />
        </TabsContent>
        <TabsContent value="GL">
          <AmTable rows={glRows} onView={setDetail} />
        </TabsContent>
      </Tabs>
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("title")} — {tc("view")}</DialogTitle><DialogDescription>{t("desc")}</DialogDescription></DialogHeader>
          {detail && <div className="grid gap-4 sm:grid-cols-2">
            {(["store_location", "category", "sub_category", "item_group", "department", "account_code"] as const).map((key, index) => (
              <Field key={key}><FieldLabel>{tfl(["location", "category", "subCategory", "itemGroup", "department", "accountCode"][index])}</FieldLabel><FieldPlainText>{[detail[key].code, detail[key].name].filter(Boolean).join(" — ") || "—"}</FieldPlainText></Field>
            ))}
            <Field><FieldLabel>{t("mapped")}</FieldLabel><FieldPlainText>{detail.is_mapped ? t("mapped") : t("notMapped")}</FieldPlainText></Field>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>{tc("close")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPageShell>
  );
}
