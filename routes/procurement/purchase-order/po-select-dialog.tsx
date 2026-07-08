import { useTranslations } from "use-intl";
import { CheckSquare, ListChecks } from "lucide-react";
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
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <div className="space-y-5 p-6">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("selectItemsTitle")}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {t("selectItemsDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
            >
              <ListChecks className="text-foreground size-5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-sm font-semibold">
                    {t("selectAllItems")}
                  </h3>
                  <Badge
                    variant="invert-light"
                    size="xs"
                    className="tabular-nums"
                  >
                    {allCount}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t("selectAllDesc")}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onSelectPending}
              className="group hover:border-primary/40 bg-card focus-visible:ring-primary/40 flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2"
            >
              <CheckSquare className="text-primary size-5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-sm font-semibold">
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
                <p className="text-muted-foreground text-xs leading-relaxed">
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
