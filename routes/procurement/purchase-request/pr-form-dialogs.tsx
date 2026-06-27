import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { WarningDialog } from "@/components/ui/warning-dialog";
import type { DiscardDialogProps as DiscardConfirmDialogProps } from "@/hooks/use-discard-confirm";
import type { PurchaseRequest } from "@/types/purchase-request";
import type { useDeletePurchaseRequest } from "@/hooks/use-purchase-request";
import type { ActionDialogState } from "./use-pr-form-actions";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const PrCommentSheet = lazy(() =>
  import("./workflow/pr-comment-sheet").then((mod) => ({ default: mod.PrCommentSheet })),
);

const PrActionDialog = lazy(() =>
  import("./workflow/pr-action-dialog").then((mod) => ({ default: mod.PrActionDialog })),
);

type DeletePrMutation = ReturnType<typeof useDeletePurchaseRequest>;

interface PrFormDialogsProps {
  purchaseRequest?: PurchaseRequest;
  showDelete: boolean;
  setShowDelete: (open: boolean) => void;
  deletePr: DeletePrMutation;
  showComment: boolean;
  setShowComment: (open: boolean) => void;
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
        <Suspense fallback={null}>
          <PrActionDialog
            open={!!actionDialog.type}
            onOpenChange={(open) => {
              if (!open) setActionDialog({ type: null });
            }}
            isPending={isPending}
            onConfirm={onActionConfirm}
            {...actionDialogConfig[actionDialog.type]}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <PrCommentSheet
          prId={purchaseRequest?.id}
          open={showComment}
          onOpenChange={setShowComment}
        />
      </Suspense>

      <WarningDialog
        open={showNoDepartment}
        description={t("noDepartment")}
        onConfirm={() => navigate(-1)}
      />

      <DiscardDialog {...discardDialogProps} variant="warning" />
    </>
  );
}
