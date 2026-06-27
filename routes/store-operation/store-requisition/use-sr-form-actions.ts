
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { buildItemChanges } from "@/lib/form-helpers";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { QUERY_KEYS } from "@/constant/query-keys";
import { SR_LIST_PATH } from "@/constant/store-requisition";
import {
  useCreateStoreRequisition,
  useUpdateStoreRequisition,
  useSubmitStoreRequisition,
  useApproveStoreRequisition,
  useIssueStoreRequisition,
  useRejectStoreRequisition,
  useReviewStoreRequisition,
  useDeleteStoreRequisition,
  type SrActionPayload,
  type SrStageDetail,
} from "@/hooks/use-store-requisition";
import type {
  StoreRequisition,
  CreateStoreRequisitionDto,
} from "@/types/store-requisition";
import type { FormMode } from "@/types/form";
import { STAGE_ROLE } from "@/types/stage-role";
import type { SrFormValues } from "./sr-form-schema";
import { mapSrItemToPayload } from "./sr-form-helpers";

export type SrActionDialogType =
  | "approve"
  | "issue"
  | "reject"
  | "review"
  | null;

interface UseSrFormActionsParams {
  form: UseFormReturn<SrFormValues>;
  storeRequisition?: StoreRequisition;
  defaultValues: SrFormValues;
  mode: FormMode;
  setMode: (mode: FormMode) => void;
}

export function useSrFormActions({
  form,
  storeRequisition,
  defaultValues,
  mode,
  setMode,
}: UseSrFormActionsParams) {
  const t = useTranslations("storeOperation.storeRequisition");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  // dialog state
  const [showDelete, setShowDelete] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [actionDialog, setActionDialog] = useState<SrActionDialogType>(null);

  // mutations
  const createSr = useCreateStoreRequisition();
  const updateSr = useUpdateStoreRequisition();
  const submitSr = useSubmitStoreRequisition();
  const approveSr = useApproveStoreRequisition();
  const issueSr = useIssueStoreRequisition();
  const rejectSr = useRejectStoreRequisition();
  const reviewSr = useReviewStoreRequisition();
  const deleteSr = useDeleteStoreRequisition();

  const isPending =
    createSr.isPending ||
    updateSr.isPending ||
    submitSr.isPending ||
    approveSr.isPending ||
    issueSr.isPending ||
    rejectSr.isPending ||
    reviewSr.isPending;

  const isWorkflowActionPending =
    submitSr.isPending ||
    approveSr.isPending ||
    issueSr.isPending ||
    rejectSr.isPending ||
    reviewSr.isPending;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const currentRole = storeRequisition?.role ?? STAGE_ROLE.CREATE;

  const onSubmit = (values: SrFormValues) => {
    const store_requisition_detail = buildItemChanges(
      values.items,
      defaultValues.items,
      // RHF 7.78 type drift
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined,
      mapSrItemToPayload,
    );

    const details: CreateStoreRequisitionDto["details"] = {
      sr_date: values.sr_date,
      expected_date: values.expected_date,
      description: values.description,
      requestor_id: values.requestor_id,
      workflow_id: values.workflow_id,
      department_id: values.department_id,
      from_location_id: values.from_location_id,
      to_location_id: values.to_location_id,
      doc_version: storeRequisition?.doc_version ?? 0,
      store_requisition_detail,
    };

    if (isEdit && storeRequisition) {
      updateSr.mutate(
        { id: storeRequisition.id, stage_role: "create", details },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            form.reset(values);
            queryClient.invalidateQueries({
              queryKey: [QUERY_KEYS.STORE_REQUISITIONS],
            });
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createSr.mutate(
        { stage_role: "create", details },
        {
          onSuccess: (res) => {
            const { id } = (res as { data: { id: string } }).data;
            toast.success(tt("createSuccess", { entity: t("entity") }));
            navigate(`${SR_LIST_PATH}/${id}`, { replace: true });
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const runWorkflow = (
    mutation: typeof submitSr,
    payload: SrActionPayload,
    options?: { keepOnPage?: boolean; onDone?: () => void },
  ) => {
    if (!storeRequisition) return;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        options?.onDone?.();
        if (!options?.keepOnPage) navigate(SR_LIST_PATH);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const buildStageDetails = (
    fallbackStatus: string,
    message?: string,
    usePerItemStatus = false,
  ): SrStageDetail[] => {
    const formItems = form.getValues("items");
    return formItems
      .filter((item) => !!item.id)
      .map((item) => ({
        id: item.id ?? "",
        stage_status:
          usePerItemStatus && item.stage_status
            ? item.stage_status
            : fallbackStatus,
        stage_message: item.stage_message || message || null,
      }));
  };

  const handleSubmitSr = () => {
    if (!storeRequisition) return;
    const details: SrStageDetail[] =
      storeRequisition.store_requisition_detail?.map((d) => ({
        id: d.id,
        stage_status: "submit",
        stage_message: null,
      })) ?? [];
    runWorkflow(
      submitSr,
      { id: storeRequisition.id, stage_role: "create", details },
      { keepOnPage: true, onDone: () => setShowSubmit(false) },
    );
  };

  const handleApprove = () => {
    if (!storeRequisition) return;
    const details: SrStageDetail[] = form
      .getValues("items")
      .filter((item) => !!item.id)
      .map((item) => ({
        id: item.id ?? "",
        stage_status: item.stage_status || "approve",
        stage_message: item.stage_message || null,
        approved_qty: Number(item.approved_qty) || 0,
      }));
    runWorkflow(approveSr, {
      id: storeRequisition.id,
      stage_role: STAGE_ROLE.APPROVE,
      details,
    });
  };

  const handleIssue = () => {
    if (!storeRequisition) return;
    const details: SrStageDetail[] = form
      .getValues("items")
      .filter((item) => !!item.id)
      .map((item) => ({
        id: item.id ?? "",
        stage_status: "issue",
        stage_message: null,
        issued_qty: Number(item.issued_qty) || 0,
      }));
    runWorkflow(issueSr, {
      id: storeRequisition.id,
      stage_role: STAGE_ROLE.ISSUE,
      details,
    });
  };

  const handleReject = (message?: string) => {
    if (!storeRequisition) return;
    runWorkflow(rejectSr, {
      id: storeRequisition.id,
      stage_role: currentRole,
      details: buildStageDetails("reject", message),
    });
  };

  const handleReview = (message?: string, desStage?: string) => {
    if (!storeRequisition) return;
    runWorkflow(reviewSr, {
      id: storeRequisition.id,
      stage_role: currentRole,
      details: buildStageDetails("review", message, true),
      ...(desStage ? { des_stage: desStage } : {}),
    });
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && storeRequisition) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate(SR_LIST_PATH);
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate(SR_LIST_PATH));
    } else {
      navigate(SR_LIST_PATH);
    }
  };

  const handleConfirmDelete = () => {
    if (!storeRequisition) return;
    deleteSr.mutate(storeRequisition.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate(SR_LIST_PATH);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return {
    // pending
    isPending,
    isWorkflowActionPending,
    deleteIsPending: deleteSr.isPending,
    submitIsPending: submitSr.isPending,
    approveIsPending: approveSr.isPending,
    issueIsPending: issueSr.isPending,
    rejectIsPending: rejectSr.isPending,
    reviewIsPending: reviewSr.isPending,
    // dialog state
    showDelete,
    setShowDelete,
    showSubmit,
    setShowSubmit,
    showComment,
    setShowComment,
    actionDialog,
    setActionDialog,
    // discard
    discardDialogProps: discard.dialogProps,
    // handlers
    onSubmit,
    handleSubmitSr,
    handleApprove,
    handleIssue,
    handleReject,
    handleReview,
    handleCancel,
    handleBack,
    handleConfirmDelete,
  };
}

export type UseSrFormActionsReturn = ReturnType<typeof useSrFormActions>;
