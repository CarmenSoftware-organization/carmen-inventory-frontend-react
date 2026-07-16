
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
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
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
  const buCode = useBuCode();

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

  // guard เฉพาะตอน add/edit และมีการกรอกค้าง (dirty) — view/ยังไม่กรอก = ผ่านได้เลย
  // ครอบคลุมคลิกลิงก์ในแอป + กด browser back (ปุ่ม Back/Cancel ใช้ discard เอง)
  const navGuard = useNavigationGuard(
    (mode === "add" || mode === "edit") && form.formState.isDirty,
  );
  const navDiscardDialogProps = {
    open: navGuard.isOpen,
    onOpenChange: (o: boolean) => {
      if (!o) navGuard.cancel();
    },
    onConfirm: navGuard.confirm,
    onCancel: navGuard.cancel,
  };

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

  // หลัง /save: ดึง doc_version ล่าสุดจาก response กลับเข้า form (header + ราย
  // detail จับคู่ด้วย id) — กัน save/submit ครั้งถัดไปส่ง doc_version เก่า → 409
  // optimistic lock (tb_purchase_order_detail)
  const syncDocVersions = (saved: unknown) => {
    const data = (
      saved as {
        data?: {
          doc_version?: number;
          purchase_order_detail?: { id: string; doc_version?: number }[];
        };
      }
    )?.data;
    if (!data) return;
    if (data.doc_version != null) {
      form.setValue("doc_version", data.doc_version);
    }
    const items = form.getValues("items");
    for (const d of data.purchase_order_detail ?? []) {
      const idx = items.findIndex((it) => it.id === d.id);
      if (idx >= 0 && d.doc_version != null) {
        form.setValue(`items.${idx}.doc_version`, d.doc_version);
      }
    }
  };

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
          onSuccess: (res) => {
            syncDocVersions(res);
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
        },
      );
    } else if (mode === "add") {
      createPo.mutate(payload, {
        onSuccess: (res) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const body = res as { data?: { id?: string } } | undefined;
          const newId = body?.data?.id;
          if (newId) {
            // NOTE: อย่าเรียก setMode("view") ตรงนี้ — มันจะ re-render แล้วทำให้
            // useNavigationGuard teardown เรียก history.back() (ลบ sentinel) ก่อน
            // ที่ navigate ไป /:id (lazy route, async) จะ commit → เด้งกลับ /new
            // ปล่อยให้ route /:id mount PoForm ใหม่เป็น view mode เองพอ
            navigate(`/procurement/purchase-order/${newId}`, {
              replace: true,
            });
          } else {
            navigate("/procurement/purchase-order");
          }
        },
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

  // GET PO สดจาก DB ก่อนยิง workflow event ทุกตัว — /save bump doc_version
  // ระหว่างทาง ทำให้ค่าใน form/prop ค้างเก่า → 409 optimistic lock
  // (tb_purchase_order / tb_purchase_order_detail)
  const fetchFreshPo = async (): Promise<{
    doc_version?: number;
    purchase_order_detail?: { id: string }[];
  } | null> => {
    if (!purchaseOrder || !buCode) return null;
    try {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${purchaseOrder.id}`,
      );
      if (res.ok) return (await res.json())?.data ?? null;
    } catch {
      // network/parse fail — caller ใช้ค่า fallback จาก form/prop
    }
    return null;
  };

  const resolveDocVersion = (fresh: { doc_version?: number } | null): number =>
    fresh?.doc_version ??
    form.getValues("doc_version") ??
    purchaseOrder?.doc_version ??
    0;

  const runSubmitPo = async () => {
    if (!purchaseOrder) return;
    const fresh = await fetchFreshPo();
    const detailRows: { id: string }[] = Array.isArray(
      fresh?.purchase_order_detail,
    )
      ? fresh.purchase_order_detail
      : (purchaseOrder.purchase_order_detail ?? []);
    submitPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: "create",
        doc_version: resolveDocVersion(fresh),
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
      },
    );
  };

  const handleSubmitPo = async () => {
    if (!purchaseOrder) return;
    if (form.formState.isDirty) {
      const valid = await form.trigger();
      if (!valid) {
        revealErrors();
        toast.error(tt("validationError"));
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
        syncDocVersions(saved);
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setMode("view");
        await runSubmitPo();
        return;
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }

    await runSubmitPo();
  };

  const handleApprovePo = async () => {
    if (!purchaseOrder) return;
    const fresh = await fetchFreshPo();
    approvePo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        doc_version: resolveDocVersion(fresh),
        details: buildDetailsFromForm(),
      },
      {
        onSuccess: () => {
          toast.success(tt("updateSuccess", { entity: t("entity") }));
          setMode("view");
        },
      },
    );
  };

  const handleRejectConfirm = async (messages: Record<number, string>) => {
    if (!purchaseOrder) return;
    const message = messages[0] ?? "";
    const fresh = await fetchFreshPo();
    rejectPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        doc_version: resolveDocVersion(fresh),
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
      },
    );
  };

  // PR pattern: per-item messages keyed by item index, footer manages dialog state
  const handleReviewConfirm = async (
    messages: Record<number, string>,
    desStage: string,
  ) => {
    if (!purchaseOrder) return;
    const fresh = await fetchFreshPo();
    reviewPo.mutate(
      {
        id: purchaseOrder.id,
        stage_role: role ?? "",
        doc_version: resolveDocVersion(fresh),
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
    });
  };

  const handleDeleteConfirm = () => {
    if (!purchaseOrder) return;
    deletePo.mutate(purchaseOrder.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/procurement/purchase-order");
      },
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
    navDiscardDialogProps,
  };
}
