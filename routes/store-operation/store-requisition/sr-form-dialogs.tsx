import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import type { UseFormReturn } from "react-hook-form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import type { StoreRequisition } from "@/types/store-requisition";
import type { SrFormValues } from "./sr-form-schema";
import { SrSubmitDialog } from "./sr-submit-dialog";
import { SrActionDialog } from "./sr-action-dialog";
import type { UseSrFormActionsReturn } from "./use-sr-form-actions";
import { useSrPreviousStages } from "@/hooks/use-store-requisition";

// แทน next/dynamic ด้วย React.lazy (code-split comment-sheet chunk เหมือนเดิม)
// lazy ต้องการ default export — wrap named export ด้วย { default: ... }
const SrCommentSheet = lazy(() =>
  import("./sr-comment-sheet").then((mod) => ({ default: mod.SrCommentSheet })),
);

interface SrFormDialogsProps {
  readonly storeRequisition?: StoreRequisition;
  readonly form: UseFormReturn<SrFormValues>;
  readonly items: SrFormValues["items"];
  readonly actions: UseSrFormActionsReturn;
}

export function SrFormDialogs({
  storeRequisition,
  form,
  items,
  actions,
}: SrFormDialogsProps) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");

  // previous-stages list สำหรับ send-back — fetch เฉพาะตอน review dialog เปิด
  const { data: previousStages } = useSrPreviousStages(
    storeRequisition?.id,
    actions.actionDialog === "review",
  );

  // ใช้ list จริงจาก API; ถ้ายังไม่มี (loading/ไม่รองรับ) fallback stage เดียว
  const sendBackStages =
    previousStages && previousStages.length > 0
      ? previousStages
      : storeRequisition?.workflow_previous_stage
        ? [
            {
              key: storeRequisition.workflow_previous_stage,
              name: storeRequisition.workflow_previous_stage,
            },
          ]
        : undefined;

  const closeActionDialog = () => actions.setActionDialog(null);

  return (
    <>
      <DiscardDialog {...actions.discardDialogProps} variant="warning" />
      <DiscardDialog {...actions.navDiscardDialogProps} variant="warning" />

      {storeRequisition && (
        <DeleteDialog
          open={actions.showDelete}
          onOpenChange={(open) =>
            !open && !actions.deleteIsPending && actions.setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { srNo: storeRequisition.sr_no })}
          isPending={actions.deleteIsPending}
          onConfirm={actions.handleConfirmDelete}
        />
      )}

      <SrSubmitDialog
        open={actions.showSubmit}
        onOpenChange={actions.setShowSubmit}
        srNo={storeRequisition?.sr_no}
        isPending={actions.submitIsPending}
        onConfirm={actions.handleSubmitSr}
      />

      <SrActionDialog
        open={actions.actionDialog === "approve"}
        onOpenChange={(o) => !o && closeActionDialog()}
        title={t("approveTitle")}
        description={t("approveConfirm")}
        srNo={storeRequisition?.sr_no}
        confirmLabel={tc("approve")}
        confirmVariant="success"
        isPending={actions.approveIsPending}
        showMessage={false}
        onConfirm={() => {
          actions.handleApprove();
          closeActionDialog();
        }}
      />

      <SrActionDialog
        open={actions.actionDialog === "issue"}
        onOpenChange={(o) => !o && closeActionDialog()}
        title={t("issueTitle")}
        description={t("issueConfirm")}
        srNo={storeRequisition?.sr_no}
        confirmLabel={tc("issue")}
        confirmVariant="success"
        isPending={actions.issueIsPending}
        showMessage={false}
        onConfirm={() => {
          actions.handleIssue();
          closeActionDialog();
        }}
      />

      <SrActionDialog
        open={actions.actionDialog === "reject"}
        onOpenChange={(o) => !o && closeActionDialog()}
        title={t("rejectTitle")}
        description={t("rejectConfirm")}
        srNo={storeRequisition?.sr_no}
        confirmLabel={tc("reject")}
        confirmVariant="destructive"
        isPending={actions.rejectIsPending}
        showMessage={false}
        onConfirm={() => {
          actions.handleReject();
          closeActionDialog();
        }}
      />

      <SrActionDialog
        open={actions.actionDialog === "review"}
        onOpenChange={(o) => !o && closeActionDialog()}
        title={t("sendBackTitle")}
        description={t("sendBackConfirm")}
        srNo={storeRequisition?.sr_no}
        confirmLabel={tc("sendBack")}
        confirmVariant="warning"
        isPending={actions.reviewIsPending}
        items={items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.stage_status === "review")
          .map(({ item, idx }) => ({
            index: idx,
            productName: item.product_name ?? "",
            locationName: item.unit_name ?? "",
          }))}
        stages={sendBackStages}
        onConfirm={(messages, desStage) => {
          for (const [idxStr, msg] of Object.entries(messages)) {
            const idx = Number(idxStr);
            form.setValue(`items.${idx}.stage_message`, msg, {
              shouldDirty: true,
            });
          }
          actions.handleReview(undefined, desStage);
          closeActionDialog();
        }}
      />

      <Suspense fallback={null}>
        <SrCommentSheet
          srId={storeRequisition?.id}
          open={actions.showComment}
          onOpenChange={actions.setShowComment}
        />
      </Suspense>
    </>
  );
}
