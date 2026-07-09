import { lazy, Suspense, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import type { PurchaseOrder } from "@/types/purchase-order";
import { PO_STATUS, PO_TYPE } from "@/types/purchase-order";
import type { FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import { useProfile } from "@/hooks/use-profile";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { PoHeader } from "./po-header";
import { PoGeneralFields } from "./po-general-fields";
import { PoItemFields } from "./po-item-fields";
import { PoFooterAction } from "./po-footer-action";
import { PoNotesSummary } from "./po-notes-summary";
import {
  createPoSchema,
  type PoFormValues,
  getDefaultValues,
} from "./po-form-schema";
import { PoActionDialog } from "./po-action-dialog";
import { usePoPreviousStages } from "@/hooks/use-purchase-order";
import { usePoDialogState } from "./use-po-dialog-state";
import { usePoProfileSync } from "./use-po-profile-sync";
import { usePoFormHandlers } from "./use-po-form-handlers";

const PoCommentSheet = lazy(() =>
  import("./po-comment-sheet").then((mod) => ({ default: mod.PoCommentSheet })),
);

// reuse PR's timeline — WorkflowHistoryEntry shape เหมือนกัน
const PoWorkflowHistory = lazy(() =>
  import("../purchase-request/workflow/pr-workflow-history").then((mod) => ({
    default: mod.PrWorkflowHistory,
  })),
);

interface PoFormProps {
  readonly purchaseOrder?: PurchaseOrder;
}

export default function PoForm({ purchaseOrder }: PoFormProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const { defaultCurrencyId, defaultBu, data: profileData } = useProfile();
  const [mode, setMode] = useState<FormMode>(purchaseOrder ? "view" : "add");
  const isView = mode === "view";
  const isEditMode = mode === "edit";

  const role = purchaseOrder?.role;
  const terminalStatus =
    purchaseOrder?.po_status === PO_STATUS.SENT ||
    purchaseOrder?.po_status === PO_STATUS.CLOSED ||
    purchaseOrder?.po_status === PO_STATUS.COMPLETED;
  const isReadOnly = role === STAGE_ROLE.APPROVE || terminalStatus;
  const isViewOnly = role === STAGE_ROLE.VIEW_ONLY;
  const canEdit = !isViewOnly && !terminalStatus;

  const dialogs = usePoDialogState();
  const { showDelete, showComment, showReject, showClose, showHistory } =
    dialogs;
  const hasHistory = !!purchaseOrder?.workflow_history?.length;

  const canClose =
    !!purchaseOrder &&
    (purchaseOrder.po_status === PO_STATUS.SENT ||
      purchaseOrder.po_status === PO_STATUS.PARTIAL);
  const { data: previousStages, isLoading: stagesLoading } =
    usePoPreviousStages(purchaseOrder?.id);

  const buyerName = [
    profileData?.user_info?.firstname,
    profileData?.user_info?.lastname,
  ]
    .filter(Boolean)
    .join(" ");

  const defaultValues = getDefaultValues(purchaseOrder, {
    defaultCurrencyId,
    buyerId: profileData?.id ?? "",
    buyerName,
    email: profileData?.email,
  });

  const isManual = purchaseOrder?.po_type !== PO_TYPE.PR;

  const poSchema = createPoSchema(tv, tfl, isManual);
  const form = useForm<PoFormValues>({
    resolver: zodResolver(poSchema) as Resolver<PoFormValues>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  usePoProfileSync({ form, profileData, purchaseOrder });

  // เพิ่มทุกครั้งที่ validation ไม่ผ่าน — ส่งให้ items grid auto-expand row ที่
  // location ติด error (location field อยู่ใน expanded row เท่านั้น) + scroll
  // bump จากทั้ง 2 path: Save (handleSubmit onInvalid) และ Submit (handleSubmitPo trigger)
  const [revealErrorSignal, setRevealErrorSignal] = useState(0);
  const revealErrors = () => {
    setRevealErrorSignal((c) => c + 1);
    // scroll หา field แรกที่ผิด — retry ข้ามเฟรมจน row ที่ auto-expand mount field เสร็จ
    // (order_qty rollup ระดับ item mark data-invalid ที่ QtyUnitCell ในแถวหลักแล้ว)
    scrollToFirstInvalidField();
  };

  const {
    deletePo,
    rejectPo,
    closePo,
    isPending,
    onSubmit,
    handleCancel,
    handleBack,
    handleSubmitPo,
    handleApprovePo,
    handleRejectConfirm,
    handleReviewConfirm,
    handleClosePo,
    handleDeleteConfirm,
    discardDialogProps,
    navDiscardDialogProps,
  } = usePoFormHandlers({
    purchaseOrder,
    form,
    defaultValues,
    mode,
    setMode,
    role,
    setShowReject: dialogs.setShowReject,
    setShowClose: dialogs.setShowClose,
    revealErrors,
  });

  const isDisabled = (isView && role !== STAGE_ROLE.APPROVE) || isPending;
  const isPriceListLocked =
    purchaseOrder?.po_type === PO_TYPE.PL && !isReadOnly && !isViewOnly;
  const fieldsDisabled = isDisabled || isPriceListLocked;
  // PO ที่มาจาก PR (!isManual): เนื้อหามาจาก PR หมดแล้ว ล็อกทุกอย่าง (items,
  // locations, notes) — ยกเว้น currency rate ที่ปลดไว้ใน PoGeneralFields
  // (gate ที่ fieldsDisabled ไม่ใช่ contentLocked) ให้ override เรตได้
  const isFromPr = !isManual;
  const contentLocked = fieldsDisabled || isFromPr;
  const locationsDisabled = isDisabled || isFromPr;
  const departmentName = defaultBu?.department?.name ?? "";

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <PoHeader
        purchaseOrder={purchaseOrder}
        mode={mode}
        canEdit={canEdit}
        canClose={canClose}
        terminalStatus={terminalStatus}
        isPending={isPending}
        deletePoIsPending={deletePo.isPending}
        departmentName={departmentName}
        buyerName={purchaseOrder?.buyer_name || buyerName}
        orderDate={purchaseOrder?.order_date ?? defaultValues.order_date}
        onBack={handleBack}
        onCancel={handleCancel}
        onEnterEdit={() => setMode("edit")}
        onShowClose={() => dialogs.setShowClose(true)}
        onShowComment={() => dialogs.setShowComment(true)}
        onShowDelete={() => dialogs.setShowDelete(true)}
        hasHistory={hasHistory}
        onShowHistory={() => dialogs.setShowHistory(true)}
      />
      <form
        id="po-form"
        onSubmit={form.handleSubmit(onSubmit, revealErrors)}
        className="flex flex-1 flex-col gap-4 px-4"
      >
        <PoGeneralFields
          form={form}
          disabled={fieldsDisabled}
          isManual={isManual}
          readOnly={isReadOnly}
          plainText={isView || isReadOnly}
          isDraft={
            !purchaseOrder?.po_status ||
            purchaseOrder.po_status === PO_STATUS.DRAFT
          }
        />

        <PoNotesSummary
          form={form}
          disabled={contentLocked}
          plainText={isView || isReadOnly}
        />

        <PoItemFields
          form={form}
          revealErrorSignal={revealErrorSignal}
          disabled={contentLocked}
          locationsDisabled={locationsDisabled}
          role={role}
          poStatus={purchaseOrder?.po_status}
          isPending={isPending}
          onApprove={purchaseOrder ? handleApprovePo : undefined}
          onReject={
            purchaseOrder ? () => dialogs.setShowReject(true) : undefined
          }
          onClose={purchaseOrder ? handleClosePo : undefined}
        />
      </form>

      <PoFooterAction
        control={form.control}
        currencyCode={form.getValues("currency_code")}
        isPending={isPending}
        isEditMode={isEditMode}
        role={role}
        poStatus={purchaseOrder?.po_status}
        previousStages={previousStages}
        stagesLoading={stagesLoading}
        onSubmit={purchaseOrder ? handleSubmitPo : undefined}
        onApprove={purchaseOrder ? handleApprovePo : undefined}
        onReject={purchaseOrder ? () => dialogs.setShowReject(true) : undefined}
        onReview={purchaseOrder ? handleReviewConfirm : undefined}
      />

      <DiscardDialog {...discardDialogProps} variant="warning" />
      <DiscardDialog {...navDiscardDialogProps} variant="warning" />

      {purchaseOrder && (
        <>
          <DeleteDialog
            open={showDelete}
            onOpenChange={(open) =>
              !open && !deletePo.isPending && dialogs.setShowDelete(false)
            }
            title={t("deleteTitle")}
            description={t("deleteConfirm", { poNo: purchaseOrder.po_no })}
            isPending={deletePo.isPending}
            onConfirm={handleDeleteConfirm}
          />
          <Suspense fallback={null}>
            <PoCommentSheet
              poId={purchaseOrder.id}
              open={showComment}
              onOpenChange={dialogs.setShowComment}
            />
          </Suspense>
          {hasHistory && (
            <Sheet open={showHistory} onOpenChange={dialogs.setShowHistory}>
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
                    <PoWorkflowHistory
                      history={purchaseOrder.workflow_history ?? []}
                      requestorName={purchaseOrder.buyer_name}
                      createdAt={purchaseOrder.created_at}
                    />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <PoActionDialog
            open={showReject}
            onOpenChange={(open) => {
              if (!open && !rejectPo.isPending) dialogs.setShowReject(false);
            }}
            title={t("rejectTitle")}
            description={t("rejectConfirm")}
            confirmLabel={tc("reject")}
            confirmVariant="destructive"
            isPending={rejectPo.isPending}
            onConfirm={handleRejectConfirm}
          />
          <PoActionDialog
            open={showClose}
            onOpenChange={(open) => {
              if (!open && !closePo.isPending) dialogs.setShowClose(false);
            }}
            title={t("closeTitle")}
            description={t("closeConfirm")}
            confirmLabel={tc("close")}
            confirmVariant="warning"
            isPending={closePo.isPending}
            onConfirm={() => handleClosePo()}
          />
        </>
      )}
    </div>
  );
}
