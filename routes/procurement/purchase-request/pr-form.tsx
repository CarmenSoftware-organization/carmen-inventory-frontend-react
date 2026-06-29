import { useState, useEffect } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useTranslations } from "use-intl";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { lazy, Suspense } from "react";
import type {
  PurchaseRequest,
  PurchaseRequestTemplate,
} from "@/types/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { type FormMode } from "@/types/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PrGeneralFields } from "./pr-general-fields";
import { PrItemFields } from "./pr-item-fields";
import { PrFormActions } from "./pr-form-actions";
import { PrFooterAction } from "./workflow/pr-footer-action";
import { PrFormDialogs } from "./pr-form-dialogs";
import { usePrFormActions } from "./use-pr-form-actions";
import {
  createPrSchema,
  type PrFormValues,
  getDefaultValues,
  isAllItemsComplete,
} from "./pr-form-schema";
import { useProfile } from "@/hooks/use-profile";
import { usePrPreviousStages } from "@/hooks/use-purchase-request";
import { formatDate } from "@/lib/date-utils";
import { PrHeader } from "./pr-header";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const PrWorkflowHistory = lazy(() =>
  import("./workflow/pr-workflow-history").then((mod) => ({
    default: mod.PrWorkflowHistory,
  })),
);

interface PurchaseRequestFormProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly template?: PurchaseRequestTemplate;
}

export function PurchaseRequestForm({
  purchaseRequest,
  template,
}: PurchaseRequestFormProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const {
    data: profile,
    defaultBu,
    buCode,
    dateFormat,
    hasDepartment,
  } = useProfile();

  const [mode, setMode] = useState<FormMode>(purchaseRequest ? "view" : "add");
  const isView = mode === "view";
  const isAdd = mode === "add";

  const showNoDepartment = isAdd && !!profile && !!defaultBu && !hasDepartment;
  const { data: previousStages, isLoading: stagesLoading } =
    usePrPreviousStages(
      purchaseRequest?.id,
      !!purchaseRequest?.workflow_id &&
        !!purchaseRequest?.workflow_current_stage,
    );

  const defaultValues = getDefaultValues(purchaseRequest, template);
  const role = purchaseRequest?.role ?? STAGE_ROLE.CREATE;

  const form = useForm<PrFormValues>({
    resolver: zodResolver(
      createPrSchema(tv, tfl, role),
    ) as Resolver<PrFormValues>,
    defaultValues,
    // Purchase stage บังคับ vendor/price/tax ผ่าน schema — ถ้า validate แบบ
    // onChange จะขึ้น error แดงทันทีที่แตะฟอร์ม ทำให้ตอน "send back" เหมือนถูก
    // บังคับกรอกทั้งที่ไม่ต้อง จึง validate เฉพาะตอนกด action (onSubmit) สำหรับ
    // purchase role ส่วน role อื่นคง live validation เดิมไว้
    mode: role === STAGE_ROLE.PURCHASE ? "onSubmit" : "onChange",
    reValidateMode: "onChange",
  });

  // validate เฉพาะตอนกด "Purchase Approve" เท่านั้น (action-aware) — send back
  // จะไม่เรียกตัวนี้จึงไม่บังคับกรอก vendor/price/tax. ใช้ handleSubmit เพื่อให้
  // submitCount เพิ่มและ reValidateMode:onChange ช่วยล้าง error ทันทีที่แก้ field
  const validatePurchase = () =>
    new Promise<boolean>((resolve) => {
      form.handleSubmit(
        () => resolve(true),
        () => {
          scrollToFirstInvalidField();
          resolve(false);
        },
      )();
    });

  // Re-validate เมื่อ role เปลี่ยน (schema change → ต้อง trigger ใหม่)
  useEffect(() => {
    if (form.formState.isSubmitted) form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable
  }, [role]);

  useUnsavedChanges(form.formState.isDirty);

  const actions = usePrFormActions({
    form,
    purchaseRequest,
    defaultValues,
    mode,
    setMode,
    role,
  });

  const isDisabled = isView || actions.isPending;

  const workflowId = useWatch({ control: form.control, name: "workflow_id" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const hasWorkflow = !!workflowId;
  const allItemsComplete = isAllItemsComplete(watchedItems ?? []);
  const canSave = hasWorkflow && allItemsComplete;

  const saveDisabledTitle = (() => {
    if (!hasWorkflow) return t("selectWorkflowFirst");
    if (!allItemsComplete) return t("completeAllItemsFirst");
    return undefined;
  })();

  const requestorName = profile
    ? `${profile.user_info.firstname} ${profile.user_info.lastname}`
    : "";

  const defaultRequestorName = purchaseRequest?.requestor_name;
  const defaultRequestorId = profile?.id ?? "";
  const defaultDefaultId = defaultBu?.department?.id ?? "";
  const defaultDepartmentName = purchaseRequest?.department_name;
  const defaultPrDate = purchaseRequest?.pr_date;

  const reqName = defaultRequestorName ?? requestorName;
  const departmentName =
    defaultDepartmentName ?? defaultBu?.department?.name ?? "";

  const [todayIso] = useState(() => new Date().toISOString());
  const prDateDisplay = formatDate(defaultPrDate || todayIso, dateFormat);

  useEffect(() => {
    if (!form.getValues("pr_date")) {
      form.setValue("pr_date", new Date().toISOString().split("T")[0]);
    }
    if (!profile || !defaultBu) return;
    if (!form.getValues("requestor_id")) {
      form.setValue("requestor_id", defaultRequestorId);
    }
    if (!form.getValues("department_id")) {
      form.setValue("department_id", defaultDefaultId);
    }
  }, [
    profile,
    defaultBu,
    form,
    defaultRequestorId,
    defaultDefaultId,
    isAdd,
    hasDepartment,
  ]);

  useEffect(() => {
    const formEl = document.getElementById("purchase-request-form");
    if (!formEl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();
      }
    };
    formEl.addEventListener("keydown", handler);
    return () => formEl.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="my-2">
        <PrHeader
          purchaseRequest={purchaseRequest}
          onBack={actions.handleBack}
          reqName={reqName}
          departmentName={departmentName ?? ""}
          prDateDisplay={prDateDisplay}
          actions={
            <PrFormActions
              mode={mode}
              role={role}
              prStatus={purchaseRequest?.pr_status}
              prId={purchaseRequest?.id}
              prNo={purchaseRequest?.pr_no}
              isPending={actions.isPending}
              isDeletePending={actions.deletePr.isPending}
              hasRecord={!!purchaseRequest}
              canSave={canSave}
              saveDisabledTitle={saveDisabledTitle}
              onEdit={() => setMode("edit")}
              onCancel={actions.handleCancel}
              onDelete={() => actions.setShowDelete(true)}
              onComment={() => actions.setShowComment(true)}
            />
          }
        />
      </div>

      <form
        id="purchase-request-form"
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <PrGeneralFields
          form={form}
          readOnly={isView}
          disabled={actions.isPending}
          role={role}
          fromTemplate={!!template}
        />

        <Tabs defaultValue="items">
          <TabsList variant="line">
            <TabsTrigger value="items" className="text-xs">
              {t("tabItems")}
            </TabsTrigger>
            {(purchaseRequest?.workflow_history?.length ?? 0) > 0 && (
              <TabsTrigger value="history" className="text-xs">
                {t("tabWorkflowHistory")}
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="items">
            <PrItemFields
              form={form}
              isDisabled={isDisabled}
              role={role}
              prId={purchaseRequest?.id}
              prStatus={purchaseRequest?.pr_status}
              buCode={buCode}
              defaultBu={defaultBu}
              dateFormat={dateFormat}
              onSplit={actions.handleSplit}
              previousStages={previousStages}
              stagesLoading={stagesLoading}
              onBulkReview={actions.handleBulkReview}
            />
          </TabsContent>
          {purchaseRequest?.workflow_history &&
            purchaseRequest.workflow_history.length > 0 && (
              <TabsContent value="history">
                <Suspense fallback={null}>
                  <PrWorkflowHistory
                    history={purchaseRequest.workflow_history}
                    requestorName={purchaseRequest.requestor_name}
                    createdAt={purchaseRequest.created_at}
                  />
                </Suspense>
              </TabsContent>
            )}
        </Tabs>
      </form>

      <PrFormDialogs
        purchaseRequest={purchaseRequest}
        showDelete={actions.showDelete}
        setShowDelete={actions.setShowDelete}
        deletePr={actions.deletePr}
        showComment={actions.showComment}
        setShowComment={actions.setShowComment}
        showNoDepartment={showNoDepartment}
        discardDialogProps={actions.discardDialogProps}
        actionDialog={actions.actionDialog}
        setActionDialog={actions.setActionDialog}
        isPending={actions.isPending}
        onActionConfirm={actions.handleActionConfirm}
      />

      <PrFooterAction
        role={role}
        prStatus={purchaseRequest?.pr_status}
        isPending={actions.isPending}
        hasRecord={!!purchaseRequest}
        control={form.control}
        currencyCode={defaultBu?.config?.default_currency?.code ?? ""}
        previousStages={previousStages}
        stagesLoading={stagesLoading}
        onSubmitPr={actions.handleSubmitPr}
        onApprove={actions.handleApprove}
        onReject={actions.handleReject}
        onReview={actions.handleReview}
        onPurchaseApprove={actions.handlePurchaseApprove}
        onValidatePurchase={validatePurchase}
      />
    </div>
  );
}
