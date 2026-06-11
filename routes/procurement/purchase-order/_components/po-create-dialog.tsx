
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import {
  ClipboardList,
  FileInput,
  FileText,
  Receipt,
  Sparkles,
} from "lucide-react";
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
  import("./po-from-pr-dialog").then((mod) => ({ default: mod.PoFromPrDialog })),
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
  const router = useRouter();
  const [fromPrOpen, setFromPrOpen] = useState(false);

  const handleBlankPO = () => {
    onOpenChange(false);
    router.push("/procurement/purchase-order/new");
  };

  const handleFromPR = () => {
    onOpenChange(false);
    setFromPrOpen(true);
  };

  const handleFromPriceList = () => {
    onOpenChange(false);
    router.push("/procurement/purchase-order/from-price-list");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">          <div className="relative space-y-5 p-6">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Receipt className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-medium">
                    {t("getStarted")}
                  </div>
                  <DialogTitle className="text-base">
                    {t("createTitle")}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {t("createDesc")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleBlankPO}
                className="group hover:border-warning/40 bg-card focus-visible:ring-warning/40 relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
              >
                <div
                  className="bg-warning/40 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                  aria-hidden="true"
                />
                <div className="bg-warning/10 text-warning flex size-10 items-center justify-center rounded-lg">
                  <FileText className="size-5" />
                </div>
                <div className="relative space-y-0.5">
                  <h3 className="text-sm font-semibold">{t("blankPo")}</h3>
                  <p className="text-muted-foreground text-[0.6875rem] font-medium">
                    {t("blankPoSubtitle")}
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                    {t("blankPoDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleFromPriceList}
                className="group hover:border-success/40 bg-card focus-visible:ring-success/40 relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
              >
                <div
                  className="bg-success/40 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                  aria-hidden="true"
                />
                <div className="bg-success/10 text-success flex size-10 items-center justify-center rounded-lg">
                  <ClipboardList className="size-5" />
                </div>
                <div className="relative space-y-0.5">
                  <h3 className="text-sm font-semibold">
                    {t("fromPriceList")}
                  </h3>
                  <p className="text-muted-foreground text-[0.6875rem] font-medium">
                    {t("fromPriceListSubtitle")}
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                    {t("fromPriceListDesc")}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleFromPR}
                className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 relative flex cursor-pointer flex-col items-start gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2"
              >
                <div
                  className="bg-primary/40 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
                  aria-hidden="true"
                />
                <span className="bg-primary/10 text-primary absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                  <Sparkles className="size-2.5" />
                  {t("recommended")}
                </span>
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                  <FileInput className="size-5" />
                </div>
                <div className="relative space-y-0.5">
                  <h3 className="text-sm font-semibold">{t("fromPr")}</h3>
                  <p className="text-muted-foreground text-[0.6875rem] font-medium">
                    {t("fromPrSubtitle")}
                  </p>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
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
