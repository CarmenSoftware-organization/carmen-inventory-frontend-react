
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { buildItemChanges } from "@/lib/form-helpers";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
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
  const location = useLocation();
  const buCode = useBuCode();

  // GET PR สดจาก DB ก่อนยิง workflow event — กัน 409 optimistic lock จาก
  // doc_version ที่ค้างเก่าใน form/prop หลัง /save bump (แบบเดียวกับ PO)
  const fetchFreshPr = async (
    id: string,
  ): Promise<{
    doc_version?: number;
    purchase_request_detail?: { id: string; doc_version?: number }[];
  } | null> => {
    if (!buCode) return null;
    try {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_REQUEST(buCode)}/${id}`,
      );
      if (res.ok) return (await res.json())?.data ?? null;
    } catch {
      // network/parse fail — fallback ค่าจาก form/prop
    }
    return null;
  };

  const resolveDocVersion = (fresh: { doc_version?: number } | null): number =>
    fresh?.doc_version ??
    form.getValues("doc_version") ??
    purchaseRequest?.doc_version ??
    0;

  // re-sync doc_version จาก response /save กลับเข้า form (header + ราย detail
  // ตาม id) — กัน save ซ้ำส่ง version เก่า
  const syncDocVersions = (saved: unknown) => {
    const data = (
      saved as {
        data?: {
          doc_version?: number;
          purchase_request_detail?: { id: string; doc_version?: number }[];
        };
      }
    )?.data;
    if (!data) return;
    if (data.doc_version != null) form.setValue("doc_version", data.doc_version);
    const items = form.getValues("items");
    for (const d of data.purchase_request_detail ?? []) {
      const idx = items.findIndex((it) => it.id === d.id);
      if (idx >= 0 && d.doc_version != null) {
        form.setValue(`items.${idx}.doc_version`, d.doc_version);
      }
    }
  };

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
  const [showHistory, setShowHistory] = useState(false);
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

  // guard เฉพาะตอน add/edit และมีการกรอกค้าง (dirty) — view/ยังไม่กรอก = ผ่านได้เลย
  // ครอบคลุมคลิกลิงก์ในแอป + กด browser back (ปุ่ม Back/Cancel ใช้ discard เอง)
  const navGuard = useNavigationGuard((isAdd || isEdit) && form.formState.isDirty);
  const navDiscardDialogProps = {
    open: navGuard.isOpen,
    onOpenChange: (o: boolean) => {
      if (!o) navGuard.cancel();
    },
    onConfirm: navGuard.confirm,
    onCancel: navGuard.cancel,
  };

  const handleMutationError = (err: Error) => toast.error(err.message);

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
      mapItemToPayload,
    ),
  });

  // สร้าง save payload ตาม stage role (purchase/approve ส่งรายละเอียดเต็ม,
  // role อื่นใช้ diff ของ buildCreateDetails) — ใช้ร่วมกันทั้งปุ่ม Save (onSubmit)
  // และ save-before-action ก่อนยิง workflow event
  const buildSaveDetails = (
    values: PrFormValues,
  ): CreatePurchaseRequestDto["details"] => {
    if (purchaseRequest?.role === STAGE_ROLE.PURCHASE) {
      return preparePurchaseDetails(
        values.items,
      ) as unknown as CreatePurchaseRequestDto["details"];
    }
    if (purchaseRequest?.role === STAGE_ROLE.APPROVE) {
      return prepareApproveDetails(
        values.items,
        purchaseRequest.id,
      ) as unknown as CreatePurchaseRequestDto["details"];
    }
    return buildCreateDetails(values);
  };

  // เรียก /save ก่อน workflow action ถ้าฟอร์มถูกแก้ (dirty) — กันค่าที่แก้ราย
  // row หายตอน approve/reject/send back (reject/review payload ไม่ได้ส่งค่า
  // field กลับ). คืน false ถ้า save ล้มเหลว เพื่อให้ caller หยุดไม่ยิง action ต่อ
  const saveDirtyEdits = async (): Promise<boolean> => {
    if (!purchaseRequest || !form.formState.isDirty) return true;
    try {
      const data = await updatePr.mutateAsync({
        id: purchaseRequest.id,
        stage_role: purchaseRequest.role,
        details: buildSaveDetails(form.getValues()),
      });
      syncDocVersions(data);
      return true;
    } catch (err) {
      handleMutationError(err as Error);
      return false;
    }
  };

  const onSubmit = (values: PrFormValues) => {
    const details = buildCreateDetails(values);

    if (isEdit && purchaseRequest) {
      updatePr.mutate(
        {
          id: purchaseRequest.id,
          stage_role: purchaseRequest.role,
          details: buildSaveDetails(values),
        },
        {
          onSuccess: (data) => {
            syncDocVersions(data);
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
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

  // กลับ list พร้อม tab/filter/sort ที่ค้างใน URL — navigate(-1) คือ browser back
  // ไปยัง history entry ของ list (params ถูกเก็บใน URL อยู่แล้ว). ถ้าเข้า detail
  // ตรง ๆ (deep-link, location.key === "default" คือ entry แรก ไม่มี history ในแอป)
  // fallback ไป list path เปล่า
  const goBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/procurement/purchase-request");
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  const doSubmitPr = async (
    prId: string,
    stageDetails: WorkflowStageDetail[],
  ) => {
    const fresh = await fetchFreshPr(prId);
    submitPr.mutate(
      {
        id: prId,
        stage_role: STAGE_ROLE.CREATE,
        doc_version: resolveDocVersion(fresh),
        details: stageDetails,
      },
      {
        onSuccess: onSuccessList(t("submitted")),
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
          syncDocVersions(data);
          const savedItems = toSubmitStageDetails(
            (data as { data?: { purchase_request_detail?: { id: string }[] } })
              ?.data?.purchase_request_detail,
          );
          void doSubmitPr(purchaseRequest.id, savedItems);
        },
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
            {
              id: newId,
              stage_role: STAGE_ROLE.CREATE,
              doc_version: data.data.doc_version,
              details: stageDetails,
            },
            {
              onSuccess: onSuccessList(t("submitted")),
            },
          );
        },
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

  const handleApprove = async () => {
    if (!purchaseRequest) return;
    if (!(await saveDirtyEdits())) return;
    const fresh = await fetchFreshPr(purchaseRequest.id);
    approvePr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.APPROVE,
        doc_version: resolveDocVersion(fresh),
        details: prepareApproveDetails(
          form.getValues("items"),
          purchaseRequest.id,
        ),
      },
      {
        onSuccess: onSuccessList(t("prApproved")),
      },
    );
  };

  const handlePurchaseApprove = async () => {
    if (!purchaseRequest) return;
    if (!(await saveDirtyEdits())) return;
    const fresh = await fetchFreshPr(purchaseRequest.id);
    purchaseApprovePr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: STAGE_ROLE.PURCHASE,
        doc_version: resolveDocVersion(fresh),
        details: prepareApproveDetails(
          form.getValues("items"),
          purchaseRequest.id,
        ),
      },
      {
        onSuccess: onSuccessList(t("purchaseApproved")),
      },
    );
  };

  const handleReject = async () => {
    if (!purchaseRequest) return;
    if (!(await saveDirtyEdits())) return;
    const details = prepareStageDetails(form.getValues("items"));
    const fresh = await fetchFreshPr(purchaseRequest.id);
    rejectPr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.CREATE,
        doc_version: resolveDocVersion(fresh),
        details,
      },
      {
        onSuccess: onSuccessList(t("prRejected")),
      },
    );
  };

  const handleReview = async (
    messages: Record<number, string>,
    desStage: string,
  ) => {
    if (!purchaseRequest) return;
    if (!(await saveDirtyEdits())) return;
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
    const fresh = await fetchFreshPr(purchaseRequest.id);
    reviewPr.mutate(
      {
        id: purchaseRequest.id,
        stage_role: role || STAGE_ROLE.CREATE,
        doc_version: resolveDocVersion(fresh),
        details,
        ...(effectiveDesStage ? { des_stage: effectiveDesStage } : {}),
      },
      {
        onSuccess: onSuccessList(t("sentBack")),
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

  const handleActionConfirm = async (
    messages: Record<number, string>,
    desStage?: string,
  ) => {
    if (!purchaseRequest) return;

    const message = Object.values(messages)[0] ?? "";
    const details = prepareStageDetails(form.getValues("items"), message);
    const fresh = await fetchFreshPr(purchaseRequest.id);
    const payload = {
      id: purchaseRequest.id,
      stage_role: role || STAGE_ROLE.CREATE,
      doc_version: resolveDocVersion(fresh),
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
    showHistory,
    setShowHistory,
    discardDialogProps: discard.dialogProps,
    navDiscardDialogProps,
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
