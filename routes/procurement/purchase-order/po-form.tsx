
import { lazy, Suspense, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import type { PurchaseOrder } from "@/types/purchase-order";
import { PO_STATUS, PO_TYPE } from "@/types/purchase-order";
import type { FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import { useProfile } from "@/hooks/use-profile";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
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
  const { showDelete, showComment, showReject, showClose } = dialogs;

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
    scrollToFirstInvalidField();
    // order_qty ของ item = ยอดรวมจาก locations แสดงแบบ read-only (ไม่มี aria-invalid
    // ให้ scroll หา) — ถ้า item ติด error เฉพาะ order_qty ให้ scroll ไปที่แถวนั้นแทน
    // เพื่อให้ user เห็น row ที่ถูก auto-expand (กรอก qty ของ location ได้)
    const itemErrors = form.formState.errors.items;
    const rollupIdx = itemErrors
      ? Object.keys(itemErrors)
          .map(Number)
          .filter((n) => !Number.isNaN(n))
          .sort((a, b) => a - b)
          .find((i) => !!itemErrors[i]?.order_qty && !itemErrors[i]?.locations)
      : undefined;
    if (rollupIdx != null) {
      scrollToFirstInvalidField({ selector: `#po-item-row-${rollupIdx}` });
    }
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

  // PO จาก price list — สินค้า/ราคา/เงื่อนไข มาจาก price list ทั้งหมด
  // จึงล็อกทุก field ให้ผู้แก้ไขเปลี่ยนได้เฉพาะ location ของแต่ละ item เท่านั้น
  // (ไม่ใช้กับ approver / view-only — field พวกนั้น read-only อยู่แล้ว)
  const isPriceListLocked =
    purchaseOrder?.po_type === PO_TYPE.PL && !isReadOnly && !isViewOnly;
  const fieldsDisabled = isDisabled || isPriceListLocked;

  const items = useWatch({ control: form.control, name: "items" });
  const itemQtyTotal = items.reduce(
    (a, it) => a + (Number(it?.order_qty) || 0),
    0,
  );

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
      />
      <form
        id="po-form"
        onSubmit={form.handleSubmit(onSubmit, revealErrors)}
        className="flex flex-1 flex-col gap-4"
      >
        <section className="space-y-3">
          <div className="border-border/60 space-y-0.5 border-b pb-2">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {t("sectionVendor")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("sectionVendorSub")}
            </p>
          </div>
          <PoGeneralFields
            form={form}
            disabled={fieldsDisabled}
            isManual={isManual}
            readOnly={isReadOnly}
            plainText={isView || isReadOnly}
          />
        </section>

        {/* Section 2 — flat (ไม่ห่อ card) ให้ตาราง line items เต็มความกว้าง */}
        <section className="space-y-3">
          <div className="border-border/60 flex items-baseline justify-between gap-2 border-b pb-2">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {t("sectionItems")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("sectionItemsSub", {
                count: items.length,
                qty: itemQtyTotal,
              })}
            </p>
          </div>
          <PoItemFields
            form={form}
            revealErrorSignal={revealErrorSignal}
            disabled={fieldsDisabled}
            locationsDisabled={isDisabled}
            role={role}
            poStatus={purchaseOrder?.po_status}
            isPending={isPending}
            onApprove={purchaseOrder ? handleApprovePo : undefined}
            onReject={
              purchaseOrder ? () => dialogs.setShowReject(true) : undefined
            }
            onClose={purchaseOrder ? handleClosePo : undefined}
          />
        </section>

        <section className="space-y-3">
          <div className="border-border/60 space-y-0.5 border-b pb-2">
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {t("sectionNotes")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("sectionNotesSub")}
            </p>
          </div>
          <PoNotesSummary
            form={form}
            disabled={fieldsDisabled}
            plainText={isView || isReadOnly}
          />
        </section>
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
