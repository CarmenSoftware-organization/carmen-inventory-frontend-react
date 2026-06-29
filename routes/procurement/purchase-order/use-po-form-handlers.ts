
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useReviewPurchaseOrder,
  useClosePurchaseOrder,
} from "@/hooks/use-purchase-order";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import type { PurchaseOrder } from "@/types/purchase-order";
import { PO_TYPE } from "@/types/purchase-order";
import type { FormMode } from "@/types/form";
import { buildPoPayload } from "./build-po-payload";
import type { PoFormValues } from "./po-form-schema";

interface UsePoFormHandlersOptions {
  purchaseOrder: PurchaseOrder | undefined;
  form: UseFormReturn<PoFormValues>;
  defaultValues: PoFormValues;
  mode: FormMode;
  setMode: Dispatch<SetStateAction<FormMode>>;
  role: string | undefined;
  setShowReject: Dispatch<SetStateAction<boolean>>;
  setShowClose: Dispatch<SetStateAction<boolean>>;
  /** เรียกเมื่อ validation ไม่ผ่าน — auto-expand row ที่ location error + scroll */
  revealErrors: () => void;
}

/**
 * Hook รวม mutations และ handler ทั้งหมดของฟอร์ม PO
 * จัดการ create/update/delete และ workflow actions submit/approve/reject/review/close
 * คืน isPending รวมจากทุก mutation, onSubmit สำหรับ react-hook-form และ handler ต่าง ๆ
 *
 * @param options - ตัวเลือกของ hook
 * @param options.purchaseOrder - PO ปัจจุบัน (undefined = โหมดสร้างใหม่)
 * @param options.form - UseFormReturn ของ PoFormValues
 * @param options.defaultValues - ค่าเริ่มต้นของฟอร์ม (ใช้ diff items)
 * @param options.mode - โหมดฟอร์มปัจจุบัน (add/view/edit)
 * @param options.setMode - setter ของ mode
 * @param options.role - stage role ของผู้ใช้ปัจจุบัน
 * @param options.setShowReject - setter ของ reject dialog
 * @param options.setShowClose - setter ของ close dialog
 * @returns mutations, isPending และ handlers
 * @example
 * const { onSubmit, handleApprovePo, handleRejectConfirm, isPending } = usePoFormHandlers({
 *   purchaseOrder, form, defaultValues, mode, setMode, role, setShowReject, setShowClose,
 * });
 * <form onSubmit={form.handleSubmit(onSubmit)}> ... </form>
 */
export function usePoFormHandlers({
  purchaseOrder,
  form,
  defaultValues,
  mode,
  setMode,
  role,
  setShowReject,
  setShowClose,
  revealErrors,
}: UsePoFormHandlersOptions) {
  const navigate = useNavigate();
  const t = useTranslations("procurement.purchaseOrder");
  const tt = useTranslations("toast");

  const createPo = useCreatePurchaseOrder();
  const updatePo = useUpdatePurchaseOrder();
  const deletePo = useDeletePurchaseOrder();
  const submitPo = useSubmitPurchaseOrder();
  const approvePo = useApprovePurchaseOrder();
  const rejectPo = useRejectPurchaseOrder();
  const reviewPo = useReviewPurchaseOrder();
  const closePo = useClosePurchaseOrder();

  const isPending =
    createPo.isPending ||
    updatePo.isPending ||
    submitPo.isPending ||
    approvePo.isPending ||
    rejectPo.isPending ||
    reviewPo.isPending ||
    closePo.isPending;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const buildDetailsFromForm = () =>
    form.getValues("items").map((item, i) => ({
      id: item.id ?? purchaseOrder?.purchase_order_detail?.[i]?.id ?? "",
      stage_status: item.stage_status || "approve",
      stage_message: item.stage_message || null,
    }));

  // ส่ง po_type ชัดเจนทั้งตอน create (POST) และ edit/save (PATCH)
  // - add: PO ใหม่ผ่านฟอร์มนี้เป็น manual เสมอ
  // - edit: คงค่าเดิมของ PO (manual→manual, ไม่ทับ PL/PR)
  // กัน backend default เป็น PR (ทำให้แก้ไขทีหลังไม่ได้: PO_FROM_PR_NOT_UPDATABLE)
  const poTypeOption =
    mode === "add"
      ? { po_type: PO_TYPE.MANUAL }
      : purchaseOrder?.po_type
        ? { po_type: purchaseOrder.po_type as PO_TYPE }
        : undefined;

  const onSubmit = (values: PoFormValues) => {
    const payload = buildPoPayload(
      values,
      defaultValues.items,
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined,
      poTypeOption,
    );

    if (mode === "edit" && purchaseOrder) {
      updatePo.mutate(
        { id: purchaseOrder.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (mode === "add") {
      createPo.mutate(payload, {
        onSuccess: (res) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const body = res as { data?: { id?: string } } | undefined;
          const newId = body?.data?.id;
          if (newId) {
            navigate(`/procurement/purchase-order/${newId}`, {
              replace: true,
            });
            setMode("view");
          } else {
            navigate("/procurement/purchase-order");
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (mode === "edit" && purchaseOrder) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/procurement/purchase-order");
      }
    });
  };

  const handleBack = () => {
    if (mode === "edit" || mode === "add") {
      discard.confirm(() => navigate("/procurement/purchase-order"));
    } else {
      navigate("/procurement/purchase-order");
    }
  };

  const runSubmitPo = (savedDetails?: { id: string }[]) => {
    if (!purchaseOrder) return;
    // Prefer the detail rows from the just-saved update response (which reflect
    // rows added/removed during the edit session); fall back to the prop only
    // when no save happened or the response carried no detail list.
    const detailRows = savedDetails ?? purchaseOrder.purchase_order_detail ?? [];
    submitPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: "create",
        details: detailRows.map((d) => ({
          id: d.id,
          stage_status: "submit",
          stage_message: null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(t("submitted"));
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleSubmitPo = async () => {
    if (!purchaseOrder) return;
    if (form.formState.isDirty) {
      const valid = await form.trigger();
      if (!valid) {
        revealErrors();
        return;
      }
      const values = form.getValues();
      const payload = buildPoPayload(
        values,
        defaultValues.items,
        form.formState.dirtyFields.items as
          | Record<string, unknown>[]
          | undefined,
        poTypeOption,
      );
      try {
        const saved = await updatePo.mutateAsync({
          id: purchaseOrder.id,
          ...payload,
        });
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setMode("view");
        const savedDetails = (
          saved as { data?: { purchase_order_detail?: { id: string }[] } }
        )?.data?.purchase_order_detail;
        runSubmitPo(savedDetails);
        return;
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }

    runSubmitPo();
  };

  const handleApprovePo = () => {
    if (!purchaseOrder) return;
    approvePo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        details: buildDetailsFromForm(),
      },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleRejectConfirm = (messages: Record<number, string>) => {
    if (!purchaseOrder) return;
    const message = messages[0] ?? "";
    rejectPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        details: buildDetailsFromForm().map((d) => ({
          ...d,
          stage_status: d.stage_status || "reject",
          stage_message: d.stage_message || message || null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          setShowReject(false);
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  // PR pattern: per-item messages keyed by item index, footer manages dialog state
  const handleReviewConfirm = (
    messages: Record<number, string>,
    desStage: string,
  ) => {
    if (!purchaseOrder) return;
    reviewPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        des_stage: desStage || undefined,
        details: buildDetailsFromForm().map((d, i) => ({
          ...d,
          stage_status: d.stage_status || "review",
          stage_message: messages[i] || d.stage_message || null,
        })),
      },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          setMode("view");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleClosePo = () => {
    if (!purchaseOrder) return;
    closePo.mutate(purchaseOrder.id, {
      onSuccess: () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setShowClose(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteConfirm = () => {
    if (!purchaseOrder) return;
    deletePo.mutate(purchaseOrder.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/procurement/purchase-order");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return {
    createPo,
    updatePo,
    deletePo,
    submitPo,
    approvePo,
    rejectPo,
    reviewPo,
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
    discardDialogProps: discard.dialogProps,
  };
}
