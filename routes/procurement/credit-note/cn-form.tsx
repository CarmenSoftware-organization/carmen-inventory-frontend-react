import { lazy, Suspense, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router";
import { useTranslations } from "use-intl";
import {
  buildItemChanges,
  countInvalidItems,
  scrollToFirstInvalidField,
} from "@/lib/form-helpers";
import { toast } from "sonner";
import {
  useCreateCreditNote,
  useUpdateCreditNote,
  useDeleteCreditNote,
  useSubmitCreditNote,
} from "@/hooks/use-credit-note";
import {
  CN_STATUS,
  type CreditNoteDetail,
  type CreateCnDto,
} from "@/types/credit-note";
import type { FormMode } from "@/types/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useProfile } from "@/hooks/use-profile";
import { CnHeader } from "./cn-header";
import { CnGeneralFields } from "./cn-general-fields";
import { CnItem } from "./cn-item";
import { CnFooterAction } from "./cn-footer-action";
import {
  createCnSchema,
  type CnFormValues,
  getDefaultValues,
  mapItemToPayload,
} from "./cn-form-schema";

const CnCommentSheet = lazy(() =>
  import("./cn-comment-sheet").then((mod) => ({ default: mod.CnCommentSheet })),
);

interface CnFormProps {
  readonly creditNote?: CreditNoteDetail;
}

export function CnForm({ creditNote }: CnFormProps) {
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<FormMode>(creditNote ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createCn = useCreateCreditNote();
  const updateCn = useUpdateCreditNote();
  const deleteCn = useDeleteCreditNote();
  const submitCn = useSubmitCreditNote();
  const [showDelete, setShowDelete] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const isPending =
    createCn.isPending || updateCn.isPending || submitCn.isPending;
  const isDisabled = isView || isPending;

  const defaultValues = getDefaultValues(creditNote);

  const cnSchema = createCnSchema(tv, tfl);
  const form = useForm<CnFormValues>({
    resolver: zodResolver(cnSchema) as Resolver<CnFormValues>,
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  // ระหว่าง submit ตอน create ปิด guard — ไม่งั้น sentinel ที่ guard ดันไว้ที่ /new
  // ทำให้ navigate(replace) หลัง create ไม่กิน /new จริง → back เด้งกลับ /new
  const [isSubmitting, setIsSubmitting] = useState(false);

  // guard เฉพาะโหมด add/edit และฟอร์มมีการแก้ไข
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && form.formState.isDirty && !isSubmitting,
  );

  const cnSyncKey = [
    creditNote?.doc_version ?? "",
    ...(creditNote?.credit_note_detail ?? []).map(
      (d) => `${d.id}:${d.doc_version}`,
    ),
  ].join("|");
  useEffect(() => {
    if (mode === "view" && creditNote) {
      form.reset(getDefaultValues(creditNote));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/getDefaultValues stable; mode read intentionally without retriggering
  }, [cnSyncKey, creditNote?.id]);

  const onSubmit = (values: CnFormValues) => {
    const items = buildItemChanges(
      values.items,
      defaultValues.items,
      mapItemToPayload,
    );

    const payload: CreateCnDto = {
      ...(values.doc_version != null
        ? { doc_version: values.doc_version }
        : {}),
      credit_note_type: values.credit_note_type,
      grn_id: values.grn_id,
      grn_date: values.grn_date,
      vendor_id: values.vendor_id,
      credit_note_number: values.cn_no,
      cn_date: values.cn_date,
      cn_reason_id: values.reason,
      reference_number: values.reference_number,
      description: values.description,
      currency_id: values.currency_code,
      exchange_rate: values.exchange_rate,
      // omit ตอนว่าง — backend ไม่รับ "" (invoice_date เป็น ISO-8601 datetime)
      ...(values.invoice_no ? { invoice_no: values.invoice_no } : {}),
      ...(values.invoice_date ? { invoice_date: values.invoice_date } : {}),
      tax_invoice_no: values.tax_invoice_no,
      tax_invoice_date: values.tax_invoice_date,
      tax_amount: values.tax_amount,
      discount_amount: values.discount_amount,
      note: values.notes,
      credit_note_detail: items,
    };

    if (isEdit && creditNote) {
      updateCn.mutate(
        { id: creditNote.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network →
      // navigate(replace) กิน /new จริง → stack เหลือ [list, /:id] → back = list
      setIsSubmitting(true);
      createCn.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const newId = data?.data?.id;
          if (newId) {
            // ไม่ setMode("view") — route /:id mount CnForm view mode เอง (เลี่ยง churn)
            navigate(`/procurement/credit-note/${newId}`, { replace: true });
          } else {
            navigate("/procurement/credit-note");
          }
        },
        onError: () => setIsSubmitting(false),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && creditNote) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/procurement/credit-note");
      }
    });
  };

  const goBack = () => {
    if (location.key !== "default") {
      // navGuard.back() ไม่ใช่ navigate(-1) — ผู้ใช้ยืนยัน discard ไปแล้ว
      // ไม่ต้องให้ guard ถามซ้ำ และต้องข้าม sentinel ที่ guard ดันไว้
      navGuard.back();
    } else {
      navigate("/procurement/credit-note");
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  const isLocked =
    creditNote?.doc_status === CN_STATUS.COMPLETED ||
    creditNote?.doc_status === CN_STATUS.CANCELLED ||
    creditNote?.doc_status === CN_STATUS.VOIDED;

  // Document info ribbon — created-by + department แสดงอย่างเดียว (ไม่เข้า payload)
  // add: current user + วันนี้ · edit/view: audit.created.name + cn_date
  const { data: profileData, dateFormat } = useProfile();
  const [todayIso] = useState(() => new Date().toISOString());
  const createdByName = creditNote
    ? (creditNote.audit?.created?.name ?? "")
    : [profileData?.user_info?.firstname, profileData?.user_info?.lastname]
        .filter(Boolean)
        .join(" ");
  const cnDate = creditNote?.cn_date ?? todayIso;

  const handleSubmitCn = () => {
    if (!creditNote) return;
    // ปิด guard ก่อนยิง mutation ไม่ใช่ตอนสำเร็จ — ฟอร์มที่แก้ค้างอยู่จะทำให้
    // navigate ตอนสำเร็จไปโผล่ dialog ถามว่าจะทิ้งการแก้ไขไหม ทั้งที่ส่งไปแล้ว
    setIsSubmitting(true);
    submitCn.mutate(
      { id: creditNote.id, doc_version: creditNote.doc_version ?? 0 },
      {
        onSuccess: () => {
          toast.success(tt("submitSuccess", { entity: t("entity") }));
          navigate("/procurement/credit-note");
        },
        onError: () => {
          // ปิด dialog ให้ด้วย ไม่งั้นค้างทับ toast แจ้ง error ที่เพิ่งขึ้น
          setShowSubmit(false);
          setIsSubmitting(false);
        },
      },
    );
  };

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <CnHeader
        creditNote={creditNote}
        mode={mode}
        isPending={isPending}
        deleteIsPending={deleteCn.isPending}
        isLocked={isLocked}
        createdByName={createdByName}
        cnDate={cnDate}
        dateFormat={dateFormat}
        onBack={handleBack}
        onEnterEdit={() => setMode("edit")}
        onCancel={handleCancel}
        onShowDelete={() => setShowDelete(true)}
        onShowComment={() => setShowComment(true)}
      />

      <form
        id="cn-form"
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          scrollToFirstInvalidField();
          const count = countInvalidItems(errors as Record<string, unknown>);
          toast.warning(
            count > 0
              ? tv("incompleteItems", { count })
              : tv("incompleteDocument"),
          );
        })}
        className="space-y-3 px-4"
      >
        <CnGeneralFields form={form} disabled={isDisabled || isView} />

        {/* เส้นคั่นเต็มความกว้าง แยกข้อมูลหัวใบออกจากตารางรายการ (เหมือน PO/GRN)
            สองก้อนนี้อ่านคนละจังหวะ ก้อนบนอ่านทีเดียวจบ ก้อนล่างกวาดตาทีละแถว */}
        <hr className="border-border" />

        <CnItem form={form} disabled={isDisabled} />
      </form>

      <CnFooterAction
        control={form.control}
        canSubmit={
          isView && !isLocked && creditNote?.doc_status === CN_STATUS.DRAFT
        }
        isPending={isPending}
        onSubmitCn={() => setShowSubmit(true)}
      />

      {/* ส่งใบแล้วย้อนไม่ได้ — ถามก่อนหนึ่งครั้ง เหมือน PR/PO/SR */}
      <ConfirmDialog
        open={showSubmit}
        onOpenChange={setShowSubmit}
        title={t("submitTitle")}
        description={t("submitConfirm")}
        confirmText={tc("submit")}
        isPending={submitCn.isPending}
        onConfirm={handleSubmitCn}
      />

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />

      {creditNote && (
        <>
          <DeleteDialog
            open={showDelete}
            onOpenChange={(open) =>
              !open && !deleteCn.isPending && setShowDelete(false)
            }
            title={t("deleteTitle")}
            description={t("deleteConfirm", { cnNo: creditNote.cn_no })}
            isPending={deleteCn.isPending}
            onConfirm={() => {
              deleteCn.mutate(creditNote.id, {
                onSuccess: () => {
                  toast.success(tt("deleteSuccess", { entity: t("entity") }));
                  navigate("/procurement/credit-note");
                },
              });
            }}
          />
          <Suspense fallback={null}>
            <CnCommentSheet
              cnId={creditNote.id}
              open={showComment}
              onOpenChange={setShowComment}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
