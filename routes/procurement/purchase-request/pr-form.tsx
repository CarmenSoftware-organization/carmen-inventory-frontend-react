import { useState, useEffect } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useTranslations } from "use-intl";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  PR_STATUS,
  type PurchaseRequest,
  type PurchaseRequestTemplate,
} from "@/types/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { type FormMode } from "@/types/form";
import {
  PrDescriptionField,
  PrWorkflowField,
} from "./pr-general-fields";
import { PrItemFields } from "./pr-item-fields";
import { PrFormActions } from "./pr-form-actions";
import { PrFooterAction } from "./workflow/pr-footer-action";
import { PrFormDialogs } from "./pr-form-dialogs";
import { usePrFormActions } from "./use-pr-form-actions";
import {
  createPrSchema,
  type PrFormValues,
  getDefaultValues,
} from "./pr-form-schema";
import { useProfile } from "@/hooks/use-profile";
import { usePrPreviousStages } from "@/hooks/use-purchase-request";
import { formatDate } from "@/lib/date-utils";
import { PrHeader } from "./pr-header";

interface PurchaseRequestFormProps {
  readonly purchaseRequest?: PurchaseRequest;
  readonly template?: PurchaseRequestTemplate;
}

export function PurchaseRequestForm({
  purchaseRequest,
  template,
}: PurchaseRequestFormProps) {
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

  // draft/add เท่านั้นที่แสดง general fields — ไม่ draft แล้วซ่อน
  const isDraft =
    !purchaseRequest?.pr_status ||
    purchaseRequest.pr_status === PR_STATUS.DRAFT;

  // lock หลัง submit (status ≠ draft) เฉพาะ role ผู้สร้าง (CREATE) — role ใน
  // workflow (purchase/approve) ยังต้องเลือก/แก้ item ได้ จึงไม่โดน lock ตรงนี้
  const isDisabled =
    isView || actions.isPending || (!isDraft && role === STAGE_ROLE.CREATE);

  const hasHistory = !!purchaseRequest?.workflow_history?.length;

  // Notes (description) — view หรือหลัง submit (role != CREATE) แสดงเป็น plain text
  const descriptionReadOnly = isView || role !== STAGE_ROLE.CREATE;

  // workflow แก้ได้เฉพาะใบ draft ที่ผู้สร้างกำลังแก้อยู่และไม่ได้มาจาก template
  // นอกนั้นเป็นค่าอ่านอย่างเดียว → ไปอยู่ในแถบข้อมูลบนหัวรวมกับฟิลด์อื่น
  // (ไม่ใช่ปล่อยเป็น field เดี่ยวลอยอยู่ใต้คำอธิบาย ซึ่งอ่านเหมือนของตกหล่น)
  const workflowEditable =
    isDraft && !isView && role === STAGE_ROLE.CREATE && !template;
  const watchedDescription = useWatch({
    control: form.control,
    name: "description",
  });

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

  // Auto-populate ค่า default ที่ซ่อนไว้ (pr_date/requestor/department) — ต้อง
  // reset baseline ไม่ใช่ setValue. RHF คิด isDirty = !deepEqual(getValues(),
  // defaultValues) ทั้งฟอร์ม; setValue ค่าที่ต่างจาก default จะ "ค้าง" อยู่ใน
  // formValues แล้วพอมี action ใดไป trigger การ recompute (เช่นเพิ่ม/ลบ item,
  // profile โหลด, useWatch) ฟอร์มจะกลายเป็น dirty ทั้งที่ยังไม่ได้กรอกจริง →
  // back/navigate ติด discard. reset + keepDirtyValues ทำให้ค่า auto เป็น
  // baseline (ไม่นับ dirty) แต่ยังคงค่าที่ผู้ใช้แก้ไว้เป็น dirty ตามเดิม
  useEffect(() => {
    const values = form.getValues();
    const patch: Partial<PrFormValues> = {};
    if (!values.pr_date) {
      patch.pr_date = new Date().toISOString().split("T")[0];
    }
    if (profile && defaultBu) {
      if (!values.requestor_id) patch.requestor_id = defaultRequestorId;
      if (!values.department_id) patch.department_id = defaultDefaultId;
    }
    if (Object.keys(patch).length === 0) return;
    // ใช้ค่า auto ที่ตั้งไว้แล้วเป็น baseline ต่อ (patch.X ?? values.X) — กันเคส
    // profile โหลดทีหลัง (2 เฟส) แล้ว reset รอบสองไป wipe pr_date ที่ตั้งไว้รอบแรก
    form.reset(
      {
        ...defaultValues,
        pr_date: patch.pr_date ?? values.pr_date,
        requestor_id: patch.requestor_id ?? values.requestor_id,
        department_id: patch.department_id ?? values.department_id,
      },
      { keepDirtyValues: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form stable; defaultValues โครงสร้างคงที่ในโหมด add
  }, [profile, defaultBu, form, defaultRequestorId, defaultDefaultId]);

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
    <div className="flex flex-1 flex-col space-y-4">
      <PrHeader
        purchaseRequest={purchaseRequest}
        onBack={actions.handleBack}
        reqName={reqName}
        departmentName={departmentName ?? ""}
        prDateDisplay={prDateDisplay}
        description={descriptionReadOnly ? watchedDescription : undefined}
        workflowName={purchaseRequest?.workflow_name}
        workflowField={
          workflowEditable ? (
            <PrWorkflowField
              form={form}
              disabled={actions.isPending}
              isAdd={isAdd}
            />
          ) : undefined
        }
        descriptionField={
          descriptionReadOnly ? undefined : (
            <PrDescriptionField
              form={form}
              disabled={actions.isPending}
              className="lg:col-span-2"
            />
          )
        }
        hasHistory={hasHistory}
        onShowHistory={() => actions.setShowHistory(true)}
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
            onEdit={() => setMode("edit")}
            onCancel={actions.handleCancel}
            onDelete={() => actions.setShowDelete(true)}
            onComment={() => actions.setShowComment(true)}
            onActivity={() => actions.setShowActivity(true)}
          />
        }
      />
      <form
        id="purchase-request-form"
        onSubmit={(e) => {
          // เติมค่าที่ระบบรู้เองก่อน แล้วค่อยตรวจ — เหลือให้คนกรอกเฉพาะที่เดาแทนไม่ได้
          actions.fillKnownItemDefaults();
          form.handleSubmit(actions.onSubmit, actions.revealInvalid)(e);
        }}
        className="space-y-4 px-4"
      >
        {/* เส้นคั่นเต็มความกว้าง แยกข้อมูลหัวใบ (แถบบนหัว) ออกจากตารางรายการ
            เหมือน PO/GRN — สองก้อนนี้อ่านคนละจังหวะ ก้อนบนอ่านทีเดียวจบ
            ก้อนล่างกวาดตาทีละแถว */}
        <hr className="border-border" />

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
      </form>

      <PrFormDialogs
        purchaseRequest={purchaseRequest}
        showDelete={actions.showDelete}
        setShowDelete={actions.setShowDelete}
        deletePr={actions.deletePr}
        showComment={actions.showComment}
        setShowComment={actions.setShowComment}
        showHistory={actions.showHistory}
        setShowHistory={actions.setShowHistory}
        showActivity={actions.showActivity}
        setShowActivity={actions.setShowActivity}
        workflowHistory={purchaseRequest?.workflow_history}
        requestorName={purchaseRequest?.requestor_name}
        createdAt={purchaseRequest?.created_at}
        showNoDepartment={showNoDepartment}
        discardDialogProps={actions.discardDialogProps}
        navDiscardDialogProps={actions.navDiscardDialogProps}
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
