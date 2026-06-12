
import { lazy, Suspense, useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/compat/navigation";
import { useTranslations } from "use-intl";
import {
  buildItemChanges,
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
  type CreditNote,
  type CreateCnDto,
} from "@/types/credit-note";
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useProfile } from "@/hooks/use-profile";
import { CnHeader } from "./cn-header";
import { CnGeneralFields } from "./cn-general-fields";
import { CnItemFields } from "./cn-item-fields";
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
  readonly creditNote?: CreditNote;
}

export function CnForm({ creditNote }: CnFormProps) {
  const t = useTranslations("procurement.creditNote");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const router = useRouter();
  const [mode, setMode] = useState<FormMode>(creditNote ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createCn = useCreateCreditNote();
  const updateCn = useUpdateCreditNote();
  const deleteCn = useDeleteCreditNote();
  const submitCn = useSubmitCreditNote();
  const [showDelete, setShowDelete] = useState(false);
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

  // After a successful edit-save the update mutation invalidates the
  // CREDIT_NOTES query prefix, so useCreditNoteById refetches and the
  // `creditNote` prop comes back with the server's new doc_version + per-item
  // ids/doc_versions. Re-sync the form to it while in view mode so a second
  // consecutive edit carries the current doc_version instead of the stale
  // pre-save one (which optimistic locking would reject / mis-merge).
  //
  // Keyed on a signature of header doc_version + each item (id:doc_version),
  // NOT on `mode`. Two reasons: (1) keying on mode would fire on the edit→view
  // transition before the refetch lands — resetting to the still-stale prop and
  // dropping any just-added item from view; (2) the item signature also catches
  // a newly-added item getting its server id even if the header doc_version
  // stayed put (observed as 0 on the dev backend, so not relied on alone).
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
      form.formState.dirtyFields.items as Record<string, unknown>[] | undefined, // RHF 7.78 type drift
      mapItemToPayload,
    );

    const payload: CreateCnDto = {
      ...(values.doc_version != null ? { doc_version: values.doc_version } : {}),
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
      invoice_no: values.invoice_no,
      invoice_date: values.invoice_date,
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
          onError: (err) => toast.error(err.message),
        },
      );
    } else if (isAdd) {
      createCn.mutate(payload, {
        onSuccess: (data) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          const newId = data?.data?.id;
          if (newId) {
            router.replace(`/procurement/credit-note/${newId}`);
            setMode("view");
          } else {
            router.push("/procurement/credit-note");
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && creditNote) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        router.push("/procurement/credit-note");
      }
    });
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => router.push("/procurement/credit-note"));
    } else {
      router.push("/procurement/credit-note");
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
    submitCn.mutate(creditNote.id, {
      onSuccess: () => {
        toast.success(tt("submitSuccess", { entity: t("entity") }));
        router.refresh();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
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
        onSubmitCn={handleSubmitCn}
      />

      <form
        id="cn-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <CnGeneralFields form={form} disabled={isDisabled} plainText={isView} />
        <CnItemFields form={form} disabled={isDisabled} />
      </form>

      <CnFooterAction control={form.control} />

      <DiscardDialog {...discard.dialogProps} variant="warning" />

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
                  router.push("/procurement/credit-note");
                },
                onError: (err) => toast.error(err.message),
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
