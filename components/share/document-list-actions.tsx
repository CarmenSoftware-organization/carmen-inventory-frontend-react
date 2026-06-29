import { useTranslations } from "use-intl";
import { Download, Loader2, MoreHorizontal, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DocumentListActionsProps {
  onExport: () => void;
  isExporting: boolean;
  onAdd: () => void;
  /** ป้ายปุ่มเพิ่มเอกสาร — ส่งจาก namespace ของแต่ละโมดูล เช่น `t("add")` */
  addLabel: string;
}

/**
 * แถบปุ่ม document-level ที่ใช้ร่วมกันในหน้ารายการเอกสาร procurement
 * (PR / GRN / CN / PO): export / print / add
 *
 * Desktop แสดงเป็นปุ่มเรียงกัน ส่วน mobile ยุบ export/print ลงใน dropdown
 * export/print เหมือนกันทุกโมดูล จึง centralize ไว้ที่นี่ — ส่วนปุ่ม add
 * ต่างกันแค่ handler (`onAdd`) กับป้าย (`addLabel`)
 *
 * @param onExport - เรียกเมื่อกด export
 * @param isExporting - กำลัง export อยู่ (disable ปุ่ม + แสดง spinner)
 * @param onAdd - เรียกเมื่อกดเพิ่มเอกสารใหม่
 * @param addLabel - ป้ายปุ่มเพิ่ม (แปลจาก namespace ของโมดูล)
 */
export function DocumentListActions({
  onExport,
  isExporting,
  onAdd,
  addLabel,
}: DocumentListActionsProps) {
  const tc = useTranslations("common");

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        size="sm"
        variant="outline"
        onClick={onExport}
        disabled={isExporting}
        className="hidden sm:inline-flex"
      >
        {isExporting ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {isExporting ? tc("exporting") : tc("export")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => globalThis.print()}
        className="hidden sm:inline-flex"
      >
        <Printer aria-hidden="true" />
        {tc("print")}
      </Button>
      <Button size="sm" onClick={onAdd}>
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 shrink-0 sm:hidden"
            aria-label={tc("aria.moreActions")}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            {isExporting ? tc("exporting") : tc("export")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => globalThis.print()}>
            <Printer aria-hidden="true" />
            {tc("print")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
