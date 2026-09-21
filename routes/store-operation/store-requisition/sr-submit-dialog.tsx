import { useTranslations } from "use-intl";
import { SendHorizontal } from "lucide-react";
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
import {
  PeriodDateChoice,
  type PeriodDateChoice as PeriodDateChoiceValue,
} from "@/components/share/period-date-choice";

interface SrSubmitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly srNo?: string;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly srDate?: string;
  readonly periodDateChoice: PeriodDateChoiceValue;
  readonly onPeriodDateChoiceChange: (value: PeriodDateChoiceValue) => void;
}

export function SrSubmitDialog({
  open,
  onOpenChange,
  srNo,
  isPending,
  onConfirm,
  srDate,
  periodDateChoice,
  onPeriodDateChoiceChange,
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
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="bg-info/10 text-info-ink flex size-9 shrink-0 items-center justify-center rounded-lg">
              <SendHorizontal className="size-4.5" />
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
              {/* ส่งใบแล้วรอบบัญชีถูกผูกไปกับเอกสาร — ถ้าวันที่บนใบอยู่นอกงวด
                  ที่เปิดอยู่ ถามตรงนี้ก่อน ดีกว่าปล่อยไปให้ backend ตีกลับ 422
                  แล้วค่อยเปิด dialog ถามทีหลัง */}
              <PeriodDateChoice
                docDate={srDate}
                value={periodDateChoice}
                onChange={onPeriodDateChoiceChange}
              />
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
            <SendHorizontal />
            {isPending ? tc("processing") : tc("submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
