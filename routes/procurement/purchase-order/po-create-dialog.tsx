import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { ClipboardList, FileInput, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { lazy, Suspense } from "react";

// next/dynamic → lazy+Suspense (Batch D hand-fix)
const PoFromPrDialog = lazy(() =>
  import("./po-from-pr-dialog").then((mod) => ({
    default: mod.PoFromPrDialog,
  })),
);

interface CreatePODialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Dialog ให้เลือกวิธีสร้างใบสั่งซื้อใหม่ — premium ERP design
 *
 * รองรับ 2 เส้นทาง: สร้างจาก PR ที่มีอยู่ (Recommended) หรือเริ่มจากฟอร์มเปล่า
 * กรณีเลือก "จาก PR" จะเปิด PoFromPrDialog แบบ dynamic import
 *
 * @param props - props ของ dialog
 * @param props.open - สถานะเปิด/ปิด
 * @param props.onOpenChange - callback เมื่อเปิด/ปิด
 * @returns React element ของ dialog เลือกวิธีสร้าง PO
 * @example
 * const [createOpen, setCreateOpen] = useState(false);
 * <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} />
 */
export function CreatePODialog({ open, onOpenChange }: CreatePODialogProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const navigate = useNavigate();
  const [fromPrOpen, setFromPrOpen] = useState(false);

  const handleBlankPO = () => {
    onOpenChange(false);
    navigate("/procurement/purchase-order/new");
  };

  const handleFromPR = () => {
    onOpenChange(false);
    setFromPrOpen(true);
  };

  const handleFromPriceList = () => {
    onOpenChange(false);
    navigate("/procurement/purchase-order/from-price-list");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-base">
                {t("createTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("createDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleBlankPO}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
              >
                <FileText className="text-foreground size-5" />
                <div className="space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("blankPo")}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("blankPoDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleFromPriceList}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
              >
                <ClipboardList className="text-foreground size-5" />
                <div className="space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("fromPriceList")}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("fromPriceListDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleFromPR}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
              >
                <FileInput className="text-primary size-5" />
                <div className="space-y-0.5">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("fromPr")}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("fromPrDesc")}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {fromPrOpen && (
        <Suspense fallback={null}>
          <PoFromPrDialog open={fromPrOpen} onOpenChange={setFromPrOpen} />
        </Suspense>
      )}
    </>
  );
}
