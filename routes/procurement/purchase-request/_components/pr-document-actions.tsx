import { useTranslations } from "use-intl";
import { Download, Loader2, MoreHorizontal, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PrDocumentActionsProps {
  onExport: () => void;
  isExporting: boolean;
  onAdd: () => void;
}

/**
 * แถบปุ่ม document-level ของหน้ารายการ PR: export / print / add
 *
 * Desktop แสดงเป็นปุ่มเรียงกัน ส่วน mobile ยุบ export/print ลงใน dropdown
 * ดึงออกจาก `PurchaseRequestComponent` เพื่อรวม export/print ที่เดิมเขียนซ้ำ
 * 2 ที่ (ปุ่ม + dropdown) ไว้ที่เดียว และลดขนาด component หลัก
 *
 * @param onExport - เรียกเมื่อกด export
 * @param isExporting - กำลัง export อยู่ (disable ปุ่ม + แสดง spinner)
 * @param onAdd - เรียกเมื่อกดเพิ่มเอกสารใหม่
 */
export function PrDocumentActions({
  onExport,
  isExporting,
  onAdd,
}: PrDocumentActionsProps) {
  const t = useTranslations("procurement.purchaseRequest");
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
        {t("add")}
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
