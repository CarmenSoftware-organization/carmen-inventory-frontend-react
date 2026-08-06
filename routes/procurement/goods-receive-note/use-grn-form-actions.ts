import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
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
  /** validation ไม่ผ่าน → auto-expand group ที่ error + scroll หา field แรก */
  revealErrors?: (errors?: Record<string, unknown>) => void;
}

export function useGrnFormActions({
  form,
  goodsReceiveNote,
  defaultValues,
  mode,
  setMode,
  revealErrors,
}: UseGrnFormActionsParams) {
  const navigate = useNavigate();
  const location = useLocation();
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

  // ระหว่าง submit (จนกว่าจะ navigate/เข้า view) ปิด nav guard — ไม่งั้น sentinel
  // history entry ที่ guard ดันไว้จะทำให้ navigate(replace) หลัง create ไม่กิน /new
  // จริง → /new ค้างใน stack → back เด้งกลับ /new (ดู finalize ของ create)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // guard เฉพาะตอน add/edit และมีการกรอกค้าง (dirty) — view/ยังไม่กรอก = ผ่านได้เลย
  // ครอบคลุมคลิกลิงก์ในแอป + กด browser back (ปุ่ม Back/Cancel ใช้ discard เอง)
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty && !isSubmitting,
  );
  const navDiscardDialogProps = {
    open: navGuard.isOpen,
    onOpenChange: (o: boolean) => {
      if (!o) navGuard.cancel();
    },
    onConfirm: navGuard.confirm,
    onCancel: navGuard.cancel,
  };

  /**
   * บันทึกใบ (draft → saved) สำเร็จ → กลับหน้ารายการ เหมือน PR/PO
   *
   * เฉพาะขั้น "ปิดจบ" เท่านั้น — บันทึกร่างเฉย ๆ ยังอยู่หน้าเดิม เพราะคนกรอก
   * มักจะกรอกต่อ ไม่ใช่กรอกเสร็จ
   */
  const onSavedToList = () => {
    toast.success(tt("updateSuccess", { entity: t("entity") }));
    navigate("/procurement/goods-receive-note");
  };

  const onSubmit = (values: GrnFormValues) => {
    const isManual = values.doc_type === "manual";

    const detail = buildItemChanges(
      values.items,
      defaultValues.items,
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

    // PATCH: backend ต้องการ good_received_note_id (parent ref) ต่อ item ใน update
    if (isEdit && goodsReceiveNote && detail.update) {
      detail.update = detail.update.map((u) => ({
        ...u,
        good_received_note_id: goodsReceiveNote.id,
      }));
    }

    const extraCostDetail = buildItemChanges(
      values.extra_cost_details,
      defaultValues.extra_cost_details,
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
      post_type: values.post_type,
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
        "post_type",
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

      // ขั้น "ร่าง → บันทึกแล้ว" เป็นหน้าที่ของ /save เท่านั้น — มันไม่ได้แค่เปลี่ยน
      // ป้ายสถานะ แต่ลงรายการสต๊อกกับตัดยอดรับของ PO ด้วย · ถ้าปล่อยให้ PATCH
      // เขียน doc_status ไปก่อน ใบจะขึ้นเป็น "บันทึกแล้ว" โดยของไม่เคยเข้าสต๊อก
      // แล้ว /save ที่ยิงตามก็เจอว่าไม่ใช่ร่างแล้ว ตอบ "Only draft GRN can be saved"
      const willCallSave =
        values.doc_status === "saved" &&
        goodsReceiveNote.doc_status === "draft";
      if (willCallSave) delete patchPayload.doc_status;

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

      // ไม่มีอะไรเปลี่ยนเลย — ข้าม PATCH ไปทำขั้นบันทึกต่อได้เลย (ถ้ามี)
      if (Object.keys(patchPayload).length === 0) {
        if (willCallSave) {
          saveGrn.mutate(goodsReceiveNote.id, {
            onSuccess: onSavedToList,
            onError: () => setIsSubmitting(false),
          });
          return;
        }
        setIsSubmitting(false);
        setMode("view");
        return;
      }

      // backend ต้องการ doc_version ทุกครั้งตอน PATCH (optimistic lock)
      patchPayload.doc_version = values.doc_version;

      updateGrn.mutate(
        {
          id: goodsReceiveNote.id,
          ...(patchPayload as unknown as CreateGrnDto),
        },
        {
          onSuccess: () => {
            const finalize = () => {
              toast.success(tt("updateSuccess", { entity: t("entity") }));
              setIsSubmitting(false);
              setMode("view");
              // ล้าง dirty ให้ baseline = ค่าที่เพิ่งบันทึก — ไม่งั้นฟอร์มยังนับว่า
              // มีของค้าง แล้ว rebase จากข้อมูลสด (ที่มี doc_version ใหม่) จะไม่ทำงาน
              form.reset(form.getValues());
            };
            if (willCallSave) {
              saveGrn.mutate(goodsReceiveNote.id, {
                onSuccess: onSavedToList,
                onError: () => setIsSubmitting(false),
              });
            } else {
              finalize();
            }
          },
          onError: () => setIsSubmitting(false),
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
              // guard ถูกปิดตั้งแต่กด submit (isSubmitting) → sentinel ที่เคยดันไว้ที่
              // /new ถูก teardown ลบไปแล้ว → replace แทน /new จริง ไม่ใช่ sentinel →
              // stack เหลือ [list, /:id] → back ที่หน้า detail = กลับ list. route /:id
              // mount GrnForm เป็น view mode เอง (ไม่ setMode ที่นี่ เลี่ยง churn)
              navigate(`/procurement/goods-receive-note/${newId}`, {
                replace: true,
              });
            }
          };
          // สร้างแล้วปิดจบเลย → กลับหน้ารายการ · สร้างเป็นร่าง → เข้าหน้าใบที่
          // เพิ่งสร้างเพื่อกรอกต่อ
          if (values.doc_status === "saved" && newId) {
            saveGrn.mutate(newId, {
              onSuccess: onSavedToList,
              onError: () => setIsSubmitting(false),
            });
          } else {
            finalize();
          }
        },
        onError: () => setIsSubmitting(false),
      });
    }
  };

  const handleSubmitWithStatus = (status: string) => {
    form.setValue("doc_status", status, { shouldDirty: true });
    // ปิด guard ตั้งแต่ก่อนยิง mutation → sentinel ถูกลบระหว่างรอ network → พอ
    // create สำเร็จแล้ว navigate จะ replace /new จริง ไม่ใช่ sentinel
    setIsSubmitting(true);
    form.handleSubmit(onSubmit, (errs) => {
      setIsSubmitting(false); // validation ไม่ผ่าน → guard กลับมาเฝ้าเหมือนเดิม
      // location/received_qty/discount/tax อยู่ใน group expand → เผย + scroll +
      // บอกว่าขาดกี่รายการ (revealErrors พูดคนเดียว ไม่ต้อง toast ซ้อน)
      revealErrors?.(errs as Record<string, unknown>);
    })();
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && goodsReceiveNote) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/procurement/goods-receive-note");
      }
    });
  };

  const goBack = () => {
    if (location.key !== "default") {
      // navGuard.back() ไม่ใช่ navigate(-1) — ผู้ใช้ยืนยัน discard ไปแล้ว
      // ไม่ต้องให้ guard ถามซ้ำ และต้องข้าม sentinel ที่ guard ดันไว้
      navGuard.back();
    } else {
      navigate("/procurement/goods-receive-note");
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  const handleConfirmDelete = () => {
    if (!goodsReceiveNote) return;
    deleteGrn.mutate(goodsReceiveNote.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/procurement/goods-receive-note");
      },
    });
  };

  const handleConfirmCommit = () => {
    if (!goodsReceiveNote) return;
    commitGrn.mutate(
      {
        id: goodsReceiveNote.id,
        doc_version: goodsReceiveNote.doc_version ?? 0,
      },
      {
        onSuccess: () => {
          // commit ตัดของเข้าสต๊อกจริงและย้อนไม่ได้ — dialog เตือนไว้ก่อนกด แล้ว
          // ตอนสำเร็จต้องบอกด้วยว่าสต๊อกขยับแล้ว ไม่ใช่ "อัปเดตใบรับสินค้าสำเร็จ"
          // ซึ่งเป็นข้อความเดียวกับตอนกดเซฟเฉย ๆ คนกดแยกไม่ออกว่าของเข้าหรือยัง
          toast.success(t("committed"));
          setShowCommit(false);
        },
      },
    );
  };

  const handleConfirmVoid = () => {
    if (!goodsReceiveNote) return;
    voidGrn.mutate(goodsReceiveNote.id, {
      onSuccess: () => {
        toast.success(tt("voidSuccess", { entity: t("entity") }));
        setShowVoid(false);
      },
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
    navDiscardDialogProps,
  };
}
