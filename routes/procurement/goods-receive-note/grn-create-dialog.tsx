import { useTranslations } from "use-intl";
import { ClipboardList, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GrnCreateDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (docType: "manual" | "purchase_order") => void;
}

/**
 * Dialog เลือกวิธีเริ่มสร้าง GRN: กรอกเอง (manual) หรืออ้างอิงจาก Purchase Order
 */
export function GrnCreateDialog({
  open,
  onOpenChange,
  onSelect,
}: GrnCreateDialogProps) {
  const t = useTranslations("procurement.goodsReceiveNote");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("selectDocType")}</DialogTitle>
          <DialogDescription>{t("selectDocTypeDesc")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("manual")}
            className="group hover:border-warning/40 bg-card focus-visible:ring-warning/40 flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
          >
            <FileText className="text-warning size-5" />
            <div className="relative space-y-0.5">
              <h3 className="text-sm font-semibold">{t("manual")}</h3>
              <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                {t("manualSubtitle")}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                {t("manualDesc")}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("purchase_order")}
            className="group hover:border-info/40 bg-card focus-visible:ring-info/40 relative flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
          >
            <ClipboardList className="text-info size-5" />
            <div className="relative space-y-0.5">
              <h3 className="text-sm font-semibold">{t("purchaseOrder")}</h3>
              <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                {t("poSubtitle")}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                {t("poDesc")}
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
