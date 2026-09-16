import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Download, Loader2, MoreHorizontal, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DocumentListActionsProps {
  onAdd: () => void;
  addLabel: string;
  onExport?: () => void;
  isExporting?: boolean;
  showExport?: boolean;
  hideExportPrint?: boolean;
  addDisabled?: boolean;
  extraActions?: ReactNode;
}

/**
 * แถบปุ่ม document-level ที่ใช้ร่วมกันในหน้ารายการ (procurement PR/GRN/CN/PO
 * และ config list template): export / print / add
 *
 * Desktop แสดงเป็นปุ่มเรียงกัน ส่วน mobile ยุบ export/print ลงใน dropdown
 * - export แสดงเมื่อมี `onExport` และ `showExport` (default ตามการมี `onExport`)
 * - print แสดงเสมอ เว้นแต่ `hideExportPrint`
 * - `extraActions` แทรกก่อนปุ่ม Add; `addDisabled` ทำให้ปุ่ม Add จาง + aria-disabled
 *
 * @param onAdd - เรียกเมื่อกดเพิ่มรายการใหม่
 * @param addLabel - ป้ายปุ่มเพิ่ม (แปลจาก namespace ของโมดูล)
 * @param onExport - เรียกเมื่อกด export (omit = ไม่มีปุ่ม export)
 * @param isExporting - กำลัง export อยู่
 * @param showExport - บังคับแสดง/ซ่อนปุ่ม export (default = มี onExport)
 * @param hideExportPrint - ซ่อน export + print ทั้งหมด
 * @param addDisabled - ปุ่ม Add ถูก gate ด้วย permission
 * @param extraActions - ปุ่ม action เพิ่มเติมก่อน Add
 */
export function DocumentListActions({
  onAdd,
  addLabel,
  onExport,
  isExporting = false,
  showExport,
  hideExportPrint = false,
  addDisabled = false,
  extraActions,
}: DocumentListActionsProps) {
  const tc = useTranslations("common");

  const exportVisible =
    !hideExportPrint && (showExport ?? Boolean(onExport)) && Boolean(onExport);
  const printVisible = !hideExportPrint;
  const overflowVisible = exportVisible || printVisible;

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {exportVisible && (
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
      )}
      {printVisible && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => globalThis.print()}
          className="hidden sm:inline-flex"
        >
          <Printer aria-hidden="true" />
          {tc("print")}
        </Button>
      )}
      {extraActions}
      <Button
        size="sm"
        onClick={onAdd}
        aria-disabled={addDisabled || undefined}
        className={cn(addDisabled && "opacity-50")}
      >
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
      {overflowVisible && (
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
            {exportVisible && (
              <DropdownMenuItem onClick={onExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {isExporting ? tc("exporting") : tc("export")}
              </DropdownMenuItem>
            )}
            {printVisible && (
              <DropdownMenuItem onClick={() => globalThis.print()}>
                <Printer aria-hidden="true" />
                {tc("print")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
