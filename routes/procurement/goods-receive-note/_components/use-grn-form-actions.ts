
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import {
  useCreateGoodsReceiveNote,
  useUpdateGoodsReceiveNote,
  useDeleteGoodsReceiveNote,
  useSaveGoodsReceiveNote,
  useCommitGoodsReceiveNote,
  useVoidGoodsReceiveNote,
} from "@/hooks/use-goods-receive-note";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import type {
  GoodsReceiveNote,
  CreateGrnDto,
} from "@/types/goods-receive-note";
import type { FormMode } from "@/types/form";
import { buildItemChanges } from "@/lib/form-helpers";
import { removeSessionItem } from "@/lib/safe-storage";
import {
  mapDetailToPayload,
  mapExtraCostToPayload,
  type GrnFormValues,
} from "./grn-form-schema";

interface UseGrnFormActionsParams {
  form: UseFormReturn<GrnFormValues>;
  goodsReceiveNote?: GoodsReceiveNote;
  defaultValues: GrnFormValues;
  mode: FormMode;
  setMode: (mode: FormMode) => void;
}

export function useGrnFormActions({
  form,
  goodsReceiveNote,
  defaultValues,
  mode,
  setMode,
}: UseGrnFormActionsParams) {
  const router = useRouter();
  const t = useTranslations("procurement.goodsReceiveNote");
  const tt = useTranslations("toast");

  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createGrn = useCreateGoodsReceiveNote();
  const updateGrn = useUpdateGoodsReceiveNote();
  const deleteGrn = useDeleteGoodsReceiveNote();
  const saveGrn = useSaveGoodsReceiveNote();
  const commitGrn = useCommitGoodsReceiveNote();
  const voidGrn = useVoidGoodsReceiveNote();

  const [showDelete, setShowDelete] = useState(false);
  const [showCommit, setShowCommit] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showComment, setShowComment] = useState(false);

  const isPending =
    createGrn.isPending || updateGrn.isPending || saveGrn.isPending;
  const isActionPending = commitGrn.isPending || voidGrn.isPending;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending: isPending || isActionPending,
  });

  const onSubmit = (values: GrnFormValues) => {
    const isManual = values.doc_type === "manual";

    const detail = buildItemChanges(
      values.items,
      defaultValues.items,
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined, // RHF 7.78 type drift
      (item) => {
        const payload = mapDetailToPayload(item);
        if (isManual) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { purchase_order_detail_id, ...rest } = payload;
          return rest;
        }
        return payload;
      },
    );

    const extraCostDetail = buildItemChanges(
      values.extra_cost_details,
      defaultValues.extra_cost_details,
      form.formState.dirtyFields.extra_cost_details as Record<string, unknown>[] | undefined, // RHF 7.78 type drift
      mapExtraCostToPayload,
    );

    const raw: Record<string, unknown> = {
      doc_version: values.doc_version ?? undefined,
      note: values.note || undefined,
      grn_date: values.grn_date || undefined,
      invoice_no: values.invoice_no || undefined,
      invoice_date: values.invoice_date || undefined,
      description: values.description || undefined,
      doc_status: values.doc_status ?? "draft",
      doc_type: values.doc_type,
      is_consignment: values.is_consignment,
      is_cash: values.is_cash,
      credit_term_days: values.credit_term_days ?? undefined,
      credit_term_id: values.credit_term_id ?? undefined,
      payment_due_date: values.payment_due_date ?? undefined,
      is_active: values.is_active,
      vendor_id: values.vendor_id,
      currency_id: values.currency_id ?? undefined,
      exchange_rate: values.exchange_rate ?? undefined,
      exchange_rate_date: values.exchange_rate_date ?? undefined,
      received_at: values.received_at ?? undefined,
      good_received_note_detail: detail,
      extra_cost: {
        allocate_extra_cost_type: values.allocate_extra_cost_type || undefined,
        extra_cost_detail: extraCostDetail,
      },
    };

    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== null && v !== undefined),
    ) as unknown as CreateGrnDto;

    if (isEdit && goodsReceiveNote) {
      const headerKeys = [
        "note",
        "grn_date",
        "invoice_no",
        "invoice_date",
        "description",
        "doc_status",
        "doc_type",
        "is_consignment",
        "is_cash",
        "credit_term_days",
        "credit_term_id",
        "payment_due_date",
        "is_active",
        "vendor_id",
        "currency_id",
        "exchange_rate",
        "exchange_rate_date",
        "received_at",
      ] as const;

      const patchPayload: Record<string, unknown> = {};
      const defaultRecord = defaultValues as unknown as Record<string, unknown>;
      const valueRecord = values as unknown as Record<string, unknown>;
      const payloadRecord = payload as unknown as Record<string, unknown>;
      for (const key of headerKeys) {
        if (valueRecord[key] !== defaultRecord[key]) {
          patchPayload[key] = payloadRecord[key];
        }
      }

      const hasItemChanges = !!(detail.add || detail.update || detail.remove);
      const hasExtraCostChanges = !!(
        extraCostDetail.add ||
        extraCostDetail.update ||
        extraCostDetail.remove
      );

      if (hasItemChanges) {
        patchPayload.good_received_note_detail = detail;
      }
      if (hasExtraCostChanges) {
        patchPayload.extra_cost = {
          allocate_extra_cost_type:
            values.allocate_extra_cost_type || undefined,
          extra_cost_detail: extraCostDetail,
        };
      }

      if (Object.keys(patchPayload).length === 0) {
        setMode("view");
        return;
      }

      updateGrn.mutate(
        {
          id: goodsReceiveNote.id,
          ...(patchPayload as unknown as CreateGrnDto),
        },
        {
          onSuccess: () => {
            const finalize = () => {
              toast.success(tt("updateSuccess", { entity: t("entity") }));
              setMode("view");
            };
            if (values.doc_status === "saved") {
              saveGrn.mutate(goodsReceiveNote.id, {
                onSuccess: finalize,
                onError: (err) => toast.error(err.message),
              });
            } else {
              finalize();
            }
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createGrn.mutate(payload, {
        onSuccess: (res) => {
          removeSessionItem("grn-wizard-data");
          const body = res as { data?: { id?: string } } | undefined;
          const newId = body?.data?.id;
          const finalize = () => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            if (newId) {
              router.replace(`/procurement/goods-receive-note/${newId}`);
              setMode("view");
            }
          };
          if (values.doc_status === "saved" && newId) {
            saveGrn.mutate(newId, {
              onSuccess: finalize,
              onError: (err) => toast.error(err.message),
            });
          } else {
            finalize();
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleSubmitWithStatus = (status: string) => {
    form.setValue("doc_status", status, { shouldDirty: true });
    form.handleSubmit(onSubmit, (errs) => {
      if (errs.items?.message) {
        toast.error(errs.items.message);
      }
    })();
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && goodsReceiveNote) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        router.push("/procurement/goods-receive-note");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.push("/procurement/goods-receive-note"));
    } else {
      router.push("/procurement/goods-receive-note");
    }
  };

  const handleConfirmDelete = () => {
    if (!goodsReceiveNote) return;
    deleteGrn.mutate(goodsReceiveNote.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        router.push("/procurement/goods-receive-note");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleConfirmCommit = () => {
    if (!goodsReceiveNote) return;
    commitGrn.mutate(goodsReceiveNote.id, {
      onSuccess: () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setShowCommit(false);
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleConfirmVoid = () => {
    if (!goodsReceiveNote) return;
    voidGrn.mutate(goodsReceiveNote.id, {
      onSuccess: () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setShowVoid(false);
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return {
    deleteGrn,
    commitGrn,
    voidGrn,
    isPending,
    isActionPending,
    showDelete,
    setShowDelete,
    showCommit,
    setShowCommit,
    showVoid,
    setShowVoid,
    showComment,
    setShowComment,
    onSubmit,
    handleSubmitWithStatus,
    handleCancel,
    handleBack,
    handleConfirmDelete,
    handleConfirmCommit,
    handleConfirmVoid,
    discardDialogProps: discard.dialogProps,
  };
}
