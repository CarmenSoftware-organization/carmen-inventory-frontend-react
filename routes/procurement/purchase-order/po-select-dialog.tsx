import { useTranslations } from "use-intl";
import { CheckSquare, ListChecks, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface PoSelectDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly allCount: number;
  readonly pendingCount: number;
  readonly onSelectAll: () => void;
  readonly onSelectPending: () => void;
}

/**
 * Dialog ให้เลือก scope ของ bulk action — premium ERP design
 *
 * ผู้ใช้กดว่าต้องการใช้กับทุกรายการ หรือเฉพาะรายการที่ pending
 * ใช้กับ approve/reject bulk ใน PoItemFields
 *
 * @param props - props ของ dialog
 * @param props.open - สถานะเปิด/ปิด
 * @param props.onOpenChange - callback เปิด/ปิด
 * @param props.allCount - จำนวน item ทั้งหมด
 * @param props.pendingCount - จำนวน item ที่ pending
 * @param props.onSelectAll - callback เมื่อเลือก scope ทั้งหมด
 * @param props.onSelectPending - callback เมื่อเลือก scope เฉพาะ pending
 * @returns React element ของ dialog
 * @example
 * <PoSelectDialog open={openSelect} onOpenChange={setOpenSelect}
 *   allCount={items.length} pendingCount={pendingCount}
 *   onSelectAll={handleAll} onSelectPending={handlePending} />
 */
export function PoSelectDialog({
  open,
  onOpenChange,
  allCount,
  pendingCount,
  onSelectAll,
  onSelectPending,
}: PoSelectDialogProps) {
  const t = useTranslations("procurement.purchaseOrder");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">        <div className="relative space-y-5 p-6">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="bg-invert/10 text-invert flex size-9 shrink-0 items-center justify-center rounded-lg">
                <ListChecks className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="bg-primary/10 text-primary mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                  {t("bulkAction")}
                </div>
                <DialogTitle className="text-base">
                  {t("selectItemsTitle")}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t("selectItemsDesc")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="group hover:border-warning/40 bg-card focus-visible:ring-warning/40 flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            >
              <div className="bg-warning/10 text-warning flex size-10 items-center justify-center rounded-lg">
                <ListChecks className="size-5" />
              </div>
              <div className="relative space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {t("selectAllItems")}
                  </h3>
                  <Badge
                    variant="warning-light"
                    size="xs"
                    className="tabular-nums"
                  >
                    {allCount}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                  {t("selectAllSubtitle")}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {t("selectAllDesc")}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onSelectPending}
              className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 relative flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            >
              <span className="bg-primary/10 text-primary absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold">
                <Sparkles className="size-2.5" />
                {t("recommended")}
              </span>
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <CheckSquare className="size-5" />
              </div>
              <div className="relative space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {t("selectPendingOnly")}
                  </h3>
                  <Badge
                    variant="primary-light"
                    size="xs"
                    className="tabular-nums"
                  >
                    {pendingCount}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[0.6875rem] font-semibold">
                  {t("selectPendingSubtitle")}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {t("selectPendingDesc")}
                </p>
              </div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
