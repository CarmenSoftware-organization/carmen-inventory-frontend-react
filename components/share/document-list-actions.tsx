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
  /** เรียกเมื่อกดเพิ่มรายการใหม่ (เมื่อ `addDisabled` ก็ยังถูกเรียก — ใช้ dispatch permission-denied) */
  onAdd: () => void;
  /** ป้ายปุ่มเพิ่ม — ส่งจาก namespace ของแต่ละโมดูล เช่น `t("add")` */
  addLabel: string;
  /** เรียกเมื่อกด export (ไม่ส่ง = ไม่มีปุ่ม export) */
  onExport?: () => void;
  /** กำลัง export อยู่ (disable ปุ่ม + แสดง spinner) */
  isExporting?: boolean;
  /** แสดงปุ่ม export หรือไม่ — default = มี `onExport`; ใช้ซ่อน export แต่คง print (เช่น config ที่ไม่มี exportColumns) */
  showExport?: boolean;
  /** ซ่อน export + print ทั้งหมด (รวม overflow ของมือถือ) */
  hideExportPrint?: boolean;
  /** ปุ่ม Add ถูก gate ด้วย permission — แสดงจาง + aria-disabled (`onAdd` ยังถูกเรียกเพื่อ dispatch denied dialog) */
  addDisabled?: boolean;
  /** ปุ่ม action เพิ่มเติม วางก่อนปุ่ม Add */
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
