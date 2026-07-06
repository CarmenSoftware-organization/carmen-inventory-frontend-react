import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { WarningDialog } from "@/components/ui/warning-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DiscardDialogProps as DiscardConfirmDialogProps } from "@/hooks/use-discard-confirm";
import type {
  PurchaseRequest,
  WorkflowHistoryEntry,
} from "@/types/purchase-request";
import type { useDeletePurchaseRequest } from "@/hooks/use-purchase-request";
import type { ActionDialogState } from "./use-pr-form-actions";
// PrActionDialog ถูก static import โดย pr-item-fields / pr-footer-action อยู่แล้ว
// lazy() จึง split ไม่ได้จริง (Rollup เตือน) — import ตรงเพื่อให้ chunking สอดคล้องกัน
import { PrActionDialog } from "./workflow/pr-action-dialog";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const PrCommentSheet = lazy(() =>
  import("./pr-comment-sheet").then((mod) => ({ default: mod.PrCommentSheet })),
);

const PrWorkflowHistory = lazy(() =>
  import("./workflow/pr-workflow-history").then((mod) => ({
    default: mod.PrWorkflowHistory,
  })),
);

type DeletePrMutation = ReturnType<typeof useDeletePurchaseRequest>;

interface PrFormDialogsProps {
  purchaseRequest?: PurchaseRequest;
  showDelete: boolean;
  setShowDelete: (open: boolean) => void;
  deletePr: DeletePrMutation;
  showComment: boolean;
  setShowComment: (open: boolean) => void;
  showHistory: boolean;
  setShowHistory: (open: boolean) => void;
  workflowHistory?: WorkflowHistoryEntry[];
  requestorName?: string;
  createdAt?: string;
  showNoDepartment: boolean;
  discardDialogProps: DiscardConfirmDialogProps;
  actionDialog: ActionDialogState;
  setActionDialog: (state: ActionDialogState) => void;
  isPending: boolean;
  onActionConfirm: (
    messages: Record<number, string>,
    desStage?: string,
  ) => void;
}

export function PrFormDialogs({
  purchaseRequest,
  showDelete,
  setShowDelete,
  deletePr,
  showComment,
  setShowComment,
  showHistory,
  setShowHistory,
  workflowHistory,
  requestorName,
  createdAt,
  showNoDepartment,
  discardDialogProps,
  actionDialog,
  setActionDialog,
  isPending,
  onActionConfirm,
}: PrFormDialogsProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const navigate = useNavigate();

  const actionDialogConfig = {
    reject: {
      title: t("rejectTitle"),
      description: t("rejectDesc"),
      confirmLabel: tc("reject"),
      confirmVariant: "destructive" as const,
    },
  };

  return (
    <>
      {purchaseRequest && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deletePr.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { prNo: purchaseRequest.pr_no })}
          isPending={deletePr.isPending}
          onConfirm={() => {
            deletePr.mutate(purchaseRequest.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                navigate("/procurement/purchase-request");
              },
              onError: (err: Error) => toast.error(err.message),
            });
          }}
        />
      )}

      {actionDialog.type && (
        <PrActionDialog
          open={!!actionDialog.type}
          onOpenChange={(open) => {
            if (!open) setActionDialog({ type: null });
          }}
          isPending={isPending}
          onConfirm={onActionConfirm}
          {...actionDialogConfig[actionDialog.type]}
        />
      )}

      <Suspense fallback={null}>
        <PrCommentSheet
          prId={purchaseRequest?.id}
          open={showComment}
          onOpenChange={setShowComment}
        />
      </Suspense>

      {!!workflowHistory?.length && (
        <Sheet open={showHistory} onOpenChange={setShowHistory}>
          <SheetContent
            side="right"
            className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
          >
            <SheetHeader>
              <SheetTitle>{t("tabWorkflowHistory")}</SheetTitle>
              <SheetDescription className="sr-only">
                {t("tabWorkflowHistory")}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <Suspense fallback={null}>
                <PrWorkflowHistory
                  history={workflowHistory}
                  requestorName={requestorName}
                  createdAt={createdAt}
                />
              </Suspense>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <WarningDialog
        open={showNoDepartment}
        description={t("noDepartment")}
        onConfirm={() => navigate(-1)}
      />

      <DiscardDialog {...discardDialogProps} variant="warning" />
    </>
  );
}
