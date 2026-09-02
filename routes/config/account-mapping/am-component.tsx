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
import DisplayTemplate from "@/components/display-template";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import type { AccountMappingRow } from "@/types/account-mapping";
import { AM_MOCK_ROWS } from "./am-mock";
import { useAmTable } from "./use-am-table";

/** ค้นหาแบบกวาดทุกคอลัมน์ข้อความของแถว — พอ backend มาแล้วย้ายไปค้นฝั่ง server */
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

/** ตารางของแท็บเดียว — สองแท็บใช้โครงเดียวกัน ต่างแค่ชุดแถวที่กรองมาแล้ว */
function AmTable({ rows }: { readonly rows: AccountMappingRow[] }) {
  "use no memo";
  const table = useAmTable({ data: rows });

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

export default function AmComponent() {
  "use no memo";
  const t = useTranslations("config.accountMapping");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"AP" | "GL">("AP");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return AM_MOCK_ROWS;
    return AM_MOCK_ROWS.filter((row) => matches(row, term));
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
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={<SearchInput defaultValue={search} onSearch={setSearch} />}
      actions={
        // ยังไม่ผูก handler — วาง UI ไว้ก่อนตามที่ตกลง กดแล้วยังไม่มีอะไรเกิดขึ้น
        <>
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
        </>
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
          <AmTable rows={apRows} />
        </TabsContent>
        <TabsContent value="GL">
          <AmTable rows={glRows} />
        </TabsContent>
      </Tabs>
    </DisplayTemplate>
  );
}
