
import { useTranslations } from "use-intl";
import { Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReactNode } from "react";
interface SrSubmitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly srNo?: string;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
}

export function SrSubmitDialog({
  open,
  onOpenChange,
  srNo,
  isPending,
  onConfirm,
}: SrSubmitDialogProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");

  const renderStrong = (chunks: ReactNode) => (
    <strong className="text-foreground font-semibold">{chunks}</strong>
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => !o && !isPending && onOpenChange(false)}
    >
      <AlertDialogContent className="gap-0 p-0 sm:max-w-md">
        <span
          aria-hidden
          className="bg-primary absolute inset-x-0 top-0 z-20 h-0.5"
        />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Send className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle className="text-base">
                {t("submitTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t.rich("submitConfirm", {
                  srNo: srNo ?? "—",
                  strong: renderStrong,
                })}
              </AlertDialogDescription>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="px-5 py-3">
          <AlertDialogCancel disabled={isPending}>
            {tc("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            size="default"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
          >
            <Send />
            {isPending ? tc("processing") : tc("submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
