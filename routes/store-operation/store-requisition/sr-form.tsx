import { useState, useEffect, useRef } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldPlainText } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { useProfile } from "@/hooks/use-profile";
import {
  SR_TYPE,
  type StoreRequisition,
  type StoreRequisitionType,
} from "@/types/store-requisition";
import { type FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import { INVENTORY_TYPE } from "@/constant/location";
import {
  createSrSchema,
  computeSrAction,
  type SrFormValues,
} from "./sr-form-schema";
import { buildSrDefaultValues } from "./sr-form-helpers";
import { useSrFormActions } from "./use-sr-form-actions";
import { SrItemFields, type SrItemFieldsHandle } from "./sr-item-fields";
import { SrHeader } from "./sr-header";
import { SrRequestDetails } from "./sr-request-details";
import { SrFooter } from "./sr-footer";
import { SrFormDialogs } from "./sr-form-dialogs";

interface StoreRequisitionFormProps {
  readonly storeRequisition?: StoreRequisition;
}

interface LocationInfo {
  readonly name: string;
  readonly code: string;
  readonly location_type?: string;
}

export function StoreRequisitionForm({
  storeRequisition,
}: StoreRequisitionFormProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tfl = useTranslations("field");
  const tv = useTranslations("validation");
  const { data: profile, defaultBu, hasDepartment, dateFormat } = useProfile();

  const [mode, setMode] = useState<FormMode>(storeRequisition ? "view" : "add");
  const isView = mode === "view";
  const isAdd = mode === "add";

  const requestorName = profile
    ? `${profile.user_info.firstname} ${profile.user_info.lastname}`
    : "";
  const reqName = storeRequisition?.requestor_name ?? requestorName;
  const defaultRequestorId = profile?.id ?? "";
  const departmentName =
    storeRequisition?.department_name ?? defaultBu?.department?.name ?? "";
  const departmentCode = storeRequisition?.department_code ?? "";
  const defaultDepartmentId = defaultBu?.department?.id ?? "";

  const defaultValues = buildSrDefaultValues(
    storeRequisition,
    defaultRequestorId,
    defaultDepartmentId,
  );

  const srSchema = createSrSchema(tv, tfl);
  const form = useForm<SrFormValues>({
    resolver: zodResolver(srSchema) as Resolver<SrFormValues>,
    defaultValues,
  });

  const actions = useSrFormActions({
    form,
    storeRequisition,
    defaultValues,
    mode,
    setMode,
  });
  const isDisabled = isView || actions.isPending;

  const itemsRef = useRef<SrItemFieldsHandle>(null);

  const fromLocationId = useWatch({
    control: form.control,
    name: "from_location_id",
  });
  const toLocationId = useWatch({
    control: form.control,
    name: "to_location_id",
  });
  const srDate = useWatch({ control: form.control, name: "sr_date" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const departmentId = useWatch({
    control: form.control,
    name: "department_id",
  });
  const description = useWatch({ control: form.control, name: "description" });

  // description แก้ได้เฉพาะผู้สร้าง (role CREATE) — ขั้น approve/issue/view lock
  const srRole = storeRequisition?.role ?? STAGE_ROLE.CREATE;
  const isDescReadOnly =
    isView ||
    srRole === STAGE_ROLE.APPROVE ||
    srRole === STAGE_ROLE.ISSUE ||
    srRole === STAGE_ROLE.VIEW_ONLY;

  const [fromLocInfo, setFromLocInfo] = useState<LocationInfo>({
    name: storeRequisition?.from_location_name ?? "",
    code: storeRequisition?.from_location_code ?? "",
  });
  const [toLocInfo, setToLocInfo] = useState<LocationInfo>({
    name: storeRequisition?.to_location_name ?? "",
    code: storeRequisition?.to_location_code ?? "",
  });

  useEffect(() => {
    if (!profile || !defaultBu) return;
    if (!form.getValues("requestor_id")) {
      form.setValue("requestor_id", defaultRequestorId);
    }
    if (!form.getValues("department_id")) {
      form.setValue("department_id", defaultDepartmentId);
    }
    if (isAdd && !hasDepartment) {
      toast.warning(t("noDepartment"));
    }
  }, [
    profile,
    defaultBu,
    form,
    defaultRequestorId,
    defaultDepartmentId,
    isAdd,
    hasDepartment,
    t,
  ]);

  const canSubmit =
    isView &&
    (storeRequisition?.doc_status === "draft" ||
      storeRequisition?.doc_status === "in_progress");

  let derivedSrType: StoreRequisitionType | undefined;
  if (toLocInfo.location_type === INVENTORY_TYPE.DIRECT) {
    derivedSrType = SR_TYPE.ISSUE;
  } else if (toLocInfo.location_type) {
    derivedSrType = SR_TYPE.TRANSFER;
  } else {
    derivedSrType = storeRequisition?.sr_type;
  }

  const itemFieldsProps = {
    ref: itemsRef,
    form,
    disabled: isDisabled,
    disableAdd: !fromLocationId || !toLocationId,
    fromLocationId: fromLocationId ?? "",
    toLocationId: toLocationId ?? "",
    role: storeRequisition ? storeRequisition.role : STAGE_ROLE.CREATE,
  };

  return (
    <div className="flex min-h-full flex-col">
      <SrHeader
        storeRequisition={storeRequisition}
        srType={derivedSrType}
        mode={mode}
        isPending={actions.isPending}
        hasDepartment={!!departmentId}
        isDeletePending={actions.deleteIsPending}
        srDate={srDate}
        dateFormat={dateFormat}
        requesterName={reqName}
        departmentName={departmentName}
        departmentCode={departmentCode}
        isLoading={!profile}
        onBack={actions.handleBack}
        onEdit={() => setMode("edit")}
        onCancel={actions.handleCancel}
        onDelete={() => actions.setShowDelete(true)}
        onComment={() => actions.setShowComment(true)}
      />

      <form
        id="store-requisition-form"
        onSubmit={form.handleSubmit(actions.onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4 px-4"
      >
        <SrRequestDetails
          form={form}
          readOnly={isView}
          disabled={actions.isPending}
          dateFormat={dateFormat}
          workflowName={storeRequisition?.workflow_name}
          fromLocInfo={fromLocInfo}
          toLocInfo={toLocInfo}
          onFromLocInfoChange={setFromLocInfo}
          onToLocInfoChange={setToLocInfo}
          role={storeRequisition?.role ?? STAGE_ROLE.CREATE}
          isDraft={
            !storeRequisition?.doc_status ||
            storeRequisition.doc_status === "draft"
          }
        />

        {/* read-only แสดงเฉพาะเมื่อมี value; ตอนแก้ได้แสดง Textarea เสมอ */}
        {(!isDescReadOnly || description?.trim()) && (
          <Field className={isDescReadOnly ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor="sr-description"
              className={
                isDescReadOnly ? "text-muted-foreground font-normal" : undefined
              }
            >
              {tfl("description")}
            </FieldLabel>
            {isDescReadOnly ? (
              <FieldPlainText className="text-xs">
                <span className="whitespace-pre-line">{description}</span>
              </FieldPlainText>
            ) : (
              <Textarea
                id="sr-description"
                placeholder={t("optionalDescription")}
                className="min-h-13 text-sm"
                maxLength={256}
                disabled={actions.isPending}
                {...form.register("description")}
              />
            )}
          </Field>
        )}

        <div className="flex items-center justify-end">
          {!isDisabled && (
            <Button
              type="button"
              size="xs"
              onClick={() => itemsRef.current?.addItem()}
              disabled={!fromLocationId || !toLocationId}
            >
              <Plus /> {t("addItem")}
            </Button>
          )}
        </div>
        {form.formState.errors.items?.message && (
          <p className="text-destructive text-xs" role="alert">
            {form.formState.errors.items.message}
          </p>
        )}
        <SrItemFields {...itemFieldsProps} />
      </form>

      <SrFooter
        canSubmit={!!canSubmit}
        isPending={actions.isWorkflowActionPending}
        role={storeRequisition?.role}
        action={computeSrAction(items.map((i) => i.stage_status ?? ""))}
        onSubmit={() => actions.setShowSubmit(true)}
        onApprove={() => actions.setActionDialog("approve")}
        onIssue={() => actions.setActionDialog("issue")}
        onReject={() => actions.setActionDialog("reject")}
        onSendBack={() => actions.setActionDialog("review")}
      />

      <SrFormDialogs
        storeRequisition={storeRequisition}
        form={form}
        items={items}
        actions={actions}
      />
    </div>
  );
}
