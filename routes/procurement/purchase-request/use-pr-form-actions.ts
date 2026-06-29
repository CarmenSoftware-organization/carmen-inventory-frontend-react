
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { buildItemChanges } from "@/lib/form-helpers";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import {
  useCreatePurchaseRequest,
  useDeletePurchaseRequest,
  useUpdatePr,
  useSplitPurchaseRequest,
} from "@/hooks/use-purchase-request";
import type {
  PurchaseRequest,
  CreatePurchaseRequestDto,
  WorkflowStageDetail,
} from "@/types/purchase-request";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { type FormMode } from "@/types/form";
import {
  type PrFormValues,
  mapItemToPayload,
  prepareStageDetails,
  prepareApproveDetails,
  preparePurchaseDetails,
} from "./pr-form-schema";

export type ActionDialogState = {
  type: "reject" | null;
};

interface UsePrFormActionsParams {
  form: UseFormReturn<PrFormValues>;
  purchaseRequest?: PurchaseRequest;
  defaultValues: PrFormValues;
  mode: FormMode;
  setMode: (mode: FormMode) => void;
  role: string;
}

export function usePrFormActions({
  form,
  purchaseRequest,
  defaultValues,
  mode,
  setMode,
  role,
}: UsePrFormActionsParams) {
  const t = useTranslations("procurement.purchaseRequest");
  const tt = useTranslations("toast");
  const navigate = useNavigate();

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createPr = useCreatePurchaseRequest();
  const updatePr = useUpdatePr<CreatePurchaseRequestDto & { id: string }>(
    "save",
  );
  const deletePr = useDeletePurchaseRequest();

  const submitPr = useUpdatePr("submit");
  const approvePr = useUpdatePr("approve");
  const purchaseApprovePr = useUpdatePr("approve");
  const rejectPr = useUpdatePr("reject");
  const reviewPr = useUpdatePr("review");
  const splitPr = useSplitPurchaseRequest();

  const [showDelete, setShowDelete] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    type: null,
  });

  const isPending =
    createPr.isPending ||
    updatePr.isPending ||
    submitPr.isPending ||
    approvePr.isPending ||
    purchaseApprovePr.isPending ||
    rejectPr.isPending ||
    reviewPr.isPending ||
    splitPr.isPending;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const handleMutationError = (err: Error) => toast.error(err.message);

  const onSuccessView = (msg: string) => () => {
    toast.success(msg);
    setMode("view");
  };

  const onSuccessList = (msg: string) => () => {
    toast.success(msg);
    navigate("/procurement/purchase-request");
  };

  const toSubmitStageDetails = (
    details: { id: string }[] | undefined,
  ): WorkflowStageDetail[] =>
    (details ?? []).map((d) => ({
      id: d.id,
      stage_status: "submit",
      stage_message: "",
    }));

  const buildCreateDetails = (
    values: PrFormValues,
  ): CreatePurchaseRequestDto["details"] => ({
    ...(values.doc_version != null ? { doc_version: values.doc_version } : {}),
    pr_date: new Date(values.pr_date).toISOString(),
    description: values.description,
    requestor_id: values.requestor_id,
    workflow_id: values.workflow_id,
    department_id: values.department_id,
    purchase_request_detail: buildItemChanges(
      values.items,
      defaultValues.items,
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined, // RHF 7.78 type drift
      mapItemToPayload,
    ),
  });

  const onSubmit = (values: PrFormValues) => {
    const details = buildCreateDetails(values);

    if (isEdit && purchaseRequest) {
      const isPurchaseRole = purchaseRequest.role === STAGE_ROLE.PURCHASE;
      const isApproveRole = purchaseRequest.role === STAGE_ROLE.APPROVE;
      updatePr.mutate(
        {
          id: purchaseRequest.id,
          stage_role: purchaseRequest.role,
          details: isPurchaseRole
            ? (preparePurchaseDetails(
                values.items,
              ) as unknown as CreatePurchaseRequestDto["details"])
            : isApproveRole
              ? (prepareApproveDetails(
                  values.items,
                  purchaseRequest.id,
                ) as unknown as CreatePurchaseRequestDto["details"])
              : details,
        },
        {
          onSuccess: onSuccessView(tt("updateSuccess", { entity: t("entity") })),
          onError: handleMutationError,
        },
      );
    } else if (isAdd) {
      createPr.mutate(
        { stage_role: "create", details },
        {
          onSuccess: (data) => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            if (data?.data?.id) {
              navigate(`/procurement/purchase-request/${data.data.id}`, { replace: true });
            }
            setMode("view");
          },
          onError: handleMutationError,
        },
      );
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && purchaseRequest) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/procurement/purchase-request");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/procurement/purchase-request"));
    } else {
      navigate("/procurement/purchase-request");
    }
  };

  const doSubmitPr = (prId: string, stageDetails: WorkflowStageDetail[]) => {
    submitPr.mutate(
      { id: prId, stage_role: STAGE_ROLE.CREATE, details: stageDetails },
      {
        onSuccess: onSuccessList(t("submitted")),
        onError: handleMutationError,
      },
    );
  };

  const doSaveAndSubmitPr = (values: PrFormValues) => {
    if (!purchaseRequest) return;
    const details = buildCreateDetails(values);
    updatePr.mutate(
      { id: purchaseRequest.id, stage_role: purchaseRequest.role, details },
      {
        onSuccess: (data) => {
          const savedItems = toSubmitStageDetails(
            (data as { data?: { purchase_request_detail?: { id: string }[] } })
              ?.data?.purchase_request_detail,
          );
          doSubmitPr(purchaseRequest.id, savedItems);
        },
        onError: handleMutationError,
      },
    );
  };

  const doCreateAndSubmitPr = (values: PrFormValues) => {
    const details = buildCreateDetails(values);
    createPr.mutate(
      { stage_role: "create", details },
      {
        onSuccess: (data) => {
          if (!data?.data?.id) return;
          const newId = data.data.id;
          const stageDetails = toSubmitStageDetails(
            data.data.purchase_request_detail,
          );
          submitPr.mutate(
            { id: newId, stage_role: STAGE_ROLE.CREATE, details: stageDetails },
            {
              onSuccess: onSuccessList(t("submitted")),
              onError: handleMutationError,
            },
          );
        },
        onError: handleMutationError,
      },
    );
  };

  const handleSubmitPr = () => {
    if (purchaseRequest) {
      form.handleSubmit(doSaveAndSubmitPr)();
      return;
    }
    form.handleSubmit(doCreateAndSubmitPr)();
  };

  const handleApprove = () => {
    if (!purchaseRequest) return;
    approvePr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.APPROVE,
        details: prepareApproveDetails(
          form.getValues("items"),
          purchaseRequest.id,
        ),
      },
      {
        onSuccess: onSuccessList(t("prApproved")),
        onError: handleMutationError,
      },
    );
  };

  const handlePurchaseApprove = () => {
    if (!purchaseRequest) return;
    purchaseApprovePr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: STAGE_ROLE.PURCHASE,
        details: prepareApproveDetails(
          form.getValues("items"),
          purchaseRequest.id,
        ),
      },
      {
        onSuccess: onSuccessList(t("purchaseApproved")),
        onError: handleMutationError,
      },
    );
  };

  const handleReject = () => {
    if (!purchaseRequest) return;
    const details = prepareStageDetails(form.getValues("items"));
    rejectPr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.CREATE,
        details,
      },
      {
        onSuccess: onSuccessList(t("prRejected")),
        onError: handleMutationError,
      },
    );
  };

  const handleReview = (messages: Record<number, string>, desStage: string) => {
    if (!purchaseRequest) return;
    const items = form.getValues("items");
    const effectiveDesStage =
      desStage || items.find((item) => item.des_stage)?.des_stage;
    const details: WorkflowStageDetail[] = items
      .filter((item) => item.id)
      .map((item, index) => ({
        id: item.id!,
        stage_status:
          item.stage_status === PR_ITEM_STAGE_STATUS.REJECTED
            ? PR_ITEM_STAGE_STATUS.REJECT
            : item.stage_status || PR_ITEM_STAGE_STATUS.SUBMIT,
        stage_message: messages[index] ?? item.stage_message ?? "",
      }));
    reviewPr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.CREATE,
        details,
        ...(effectiveDesStage ? { des_stage: effectiveDesStage } : {}),
      },
      {
        onSuccess: onSuccessList(t("sentBack")),
        onError: handleMutationError,
      },
    );
  };

  const handleBulkReview = (
    detailIds: string[],
    messages: Record<number, string>,
    desStage: string,
  ) => {
    const items = form.getValues("items");
    for (const [index, item] of items.entries()) {
      if (item.id && detailIds.includes(item.id)) {
        form.setValue(`items.${index}.stage_status`, "review");
        form.setValue(`items.${index}.current_stage_status`, "review");
        form.setValue(`items.${index}.stage_message`, messages[index] ?? "");
        form.setValue(`items.${index}.des_stage`, desStage);
      }
    }
  };

  const handleActionConfirm = (
    messages: Record<number, string>,
    desStage?: string,
  ) => {
    if (!purchaseRequest) return;

    const message = Object.values(messages)[0] ?? "";
    const details = prepareStageDetails(form.getValues("items"), message);
    const payload = {
      id: purchaseRequest.id,
      stage_role: role || STAGE_ROLE.CREATE,
      details,
      ...(desStage ? { des_stage: desStage } : {}),
    };

    const actionMap = {
      reject: {
        mutation: rejectPr,
        successMsg: t("prRejected"),
      },
    };

    const action = actionDialog.type ? actionMap[actionDialog.type] : null;
    if (!action) return;

    action.mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(action.successMsg);
        setActionDialog({ type: null });
        setMode("view");
      },
      onError: handleMutationError,
    });
  };

  const handleSplit = (detailIds: string[]) => {
    if (!purchaseRequest || detailIds.length === 0) return;
    splitPr.mutate(
      { id: purchaseRequest.id, detail_ids: detailIds },
      {
        onSuccess: (data) => {
          const items = form.getValues("items");
          const detailIdSet = new Set(detailIds);
          for (const [index, item] of items.entries()) {
            if (item.id && detailIdSet.has(item.id)) {
              form.setValue(`items.${index}.stage_status`, "rejected");
              form.setValue(`items.${index}.current_stage_status`, "rejected");
            }
          }

          const newPrId = data?.data?.id;
          if (newPrId) {
            window.open(`/procurement/purchase-request/${newPrId}`, "_blank");
          }

          toast.success(t("splitSuccess"));
        },
        onError: handleMutationError,
      },
    );
  };

  return {
    deletePr,
    isPending,
    showDelete,
    setShowDelete,
    showComment,
    setShowComment,
    discardDialogProps: discard.dialogProps,
    actionDialog,
    setActionDialog,
    onSubmit,
    handleCancel,
    handleBack,
    handleSubmitPr,
    handleApprove,
    handlePurchaseApprove,
    handleReject,
    handleReview,
    handleBulkReview,
    handleActionConfirm,
    handleSplit,
  };
}
