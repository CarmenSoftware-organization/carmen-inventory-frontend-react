
import type React from "react";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { MessageSquare, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VoidDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly isPending?: boolean;
  readonly onConfirm: (voidReason: string) => void;
}

/**
 * Dialog ยืนยันการ void เอกสาร — premium ERP design
 *
 * มี destructive accent strip + gradient overlay + icon-beside-title header
 * พร้อม textarea กรอกเหตุผล (required) และ warning strip ว่าการกระทำจะถูก
 * บันทึกใน audit log ปุ่ม Void disabled จนกว่าจะกรอกเหตุผล
 */
export function VoidDialog({
  open,
  onOpenChange,
  title,
  description,
  isPending,
  onConfirm,
}: VoidDialogProps) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const [reason, setReason] = useState("");
  const isStringDescription = typeof description === "string";

  const handleOpenChange = (value: boolean) => {
    if (!value && !isPending) {
      onOpenChange(false);
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="gap-0 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
              <XCircle className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-destructive text-base">
                {title}
              </DialogTitle>
              {description && isStringDescription && (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              )}
              {description && !isStringDescription && (
                <div className="text-muted-foreground mt-1 text-sm">
                  {description}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 border-t px-5 py-4">
          <section className="space-y-1.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wider">
              <MessageSquare className="size-3" />
              {tfl("voidReason")}
              <span className="text-destructive">*</span>
            </div>
            <Textarea
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tfl("voidReasonPlaceholder")}
              className="resize-none text-sm"
              rows={3}
              maxLength={256}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-right text-[0.625rem] tabular-nums">
              {reason.length}/256
            </p>
          </section>

          <div className="bg-destructive/5 border-destructive/20 flex items-start gap-2 rounded-md border p-2 text-xs">
            <ShieldAlert className="text-destructive mt-0.5 size-3.5 shrink-0" />
            <span className="text-muted-foreground">
              การกระทำนี้จะถูกบันทึกใน audit log · ไม่สามารถย้อนกลับได้
            </span>
          </div>
        </div>

        <DialogFooter className="bg-muted/20 border-t px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="default"
            disabled={isPending || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            <XCircle />
            {isPending ? tc("processing") : tc("void")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
