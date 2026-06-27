"use no memo";

import { useState, useEffect, useRef } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkflowStep } from "@/components/share/workflow-step";
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
import { SrWorkflowHistory } from "./sr-workflow-history";
import { SrHeader } from "./sr-header";
import { SrRequestDetails } from "./sr-request-details";
import { SrTransferSummary } from "./sr-transfer-summary";
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

  const itemCount = items.length;
  const totalRequested = items.reduce(
    (s, i) => s + (Number(i.requested_qty) || 0),
    0,
  );
  const totalApproved = items.reduce(
    (s, i) => s + (Number(i.approved_qty) || 0),
    0,
  );
  const totalIssued = items.reduce(
    (s, i) => s + (Number(i.issued_qty) || 0),
    0,
  );

  const overIssuedLines = items.reduce<
    { line: number; issued: number; approved: number }[]
  >((acc, item, idx) => {
    const issued = Number(item.issued_qty) || 0;
    const approved = Number(item.approved_qty) || 0;
    if (issued > approved) {
      acc.push({ line: idx + 1, issued, approved });
    }
    return acc;
  }, []);

  let derivedSrType: StoreRequisitionType | undefined;
  if (toLocInfo.location_type === INVENTORY_TYPE.DIRECT) {
    derivedSrType = SR_TYPE.ISSUE;
  } else if (toLocInfo.location_type) {
    derivedSrType = SR_TYPE.TRANSFER;
  } else {
    derivedSrType = storeRequisition?.sr_type;
  }

  const hasWorkflowHistory =
    (storeRequisition?.workflow_history?.length ?? 0) > 0;

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
        className="flex-1 py-5"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-5">
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
            />

            {storeRequisition?.workflow_current_stage && (
              <WorkflowStep
                previousStage={storeRequisition.workflow_previous_stage}
                currentStage={storeRequisition.workflow_current_stage}
                nextStage={
                  storeRequisition.doc_status === "completed" ||
                  storeRequisition.doc_status === "cancelled" ||
                  storeRequisition.doc_status === "voided"
                    ? undefined
                    : storeRequisition.workflow_next_stage
                }
              />
            )}
          </div>

          <SrTransferSummary
            fromLocInfo={fromLocInfo}
            toLocInfo={toLocInfo}
            itemCount={itemCount}
            totalRequested={totalRequested}
            totalApproved={totalApproved}
            totalIssued={totalIssued}
            firstOverIssued={overIssuedLines[0]}
          />
        </div>

        <section className="space-y-3 pt-2">
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
          {hasWorkflowHistory ? (
            <Tabs defaultValue="items">
              <TabsList variant="line">
                <TabsTrigger value="items" className="text-xs">
                  {t("tabItems")}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  {t("tabWorkflowHistory")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="items">
                <SrItemFields {...itemFieldsProps} />
              </TabsContent>
              <TabsContent value="history">
                <SrWorkflowHistory
                  history={storeRequisition!.workflow_history}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <SrItemFields {...itemFieldsProps} />
          )}
        </section>
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
