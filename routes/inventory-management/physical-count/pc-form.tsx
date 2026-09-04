import { useState } from "react";
import { type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { FormToolbar } from "@/components/share/form-toolbar";
import { PrintDocumentButton } from "@/components/print-document-button";
import {
  useCreatePhysicalCount,
  useUpdatePhysicalCount,
  useDeletePhysicalCount,
} from "../shared/use-physical-count";
import type {
  PhysicalCount,
  CreatePhysicalCountDto,
} from "@/types/physical-count";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useEntityForm } from "@/hooks/use-entity-form";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { PcGeneralFields } from "./pc-general-fields";
import {
  createPhysicalCountSchema,
  type PhysicalCountFormValues,
  getDefaultValues,
} from "./pc-form-schema";

interface PcFormProps {
  readonly physicalCount?: PhysicalCount;
}

const LIST_PATH = "/inventory-management/physical-count";

export function PcForm({ physicalCount }: PcFormProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const createPc = useCreatePhysicalCount();
  const updatePc = useUpdatePhysicalCount();
  const deletePc = useDeletePhysicalCount();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createPc.isPending || updatePc.isPending;

  const physicalCountSchema = createPhysicalCountSchema(tv, tfl);
  const defaultValues = getDefaultValues(physicalCount);

  const f = useEntityForm<PhysicalCountFormValues>({
    entity: physicalCount,
    resolver: zodResolver(
      physicalCountSchema,
    ) as Resolver<PhysicalCountFormValues>,
    defaultValues: defaultValues,
    listPath: LIST_PATH,
    isPending,
  });
  const { form, isAdd, isEdit, isDisabled } = f;

  const onSubmit = (values: PhysicalCountFormValues) => {
    const payload = {
      department_id: values.department_id,
    } as unknown as CreatePhysicalCountDto;

    if (isEdit && physicalCount) {
      updatePc.mutate(
        {
          id: physicalCount.id,
          doc_version: physicalCount.doc_version,
          ...payload,
        },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            f.setMode("view");
          },
        },
      );
    } else if (isAdd) {
      createPc.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          f.backToList();
        },
      });
    }
  };

  return (
    // px-4 ให้ทั้ง header+form มี gutter ซ้าย — FormToolbar flush (title ตรง form
    // body) และปุ่ม back hang ออกซ้ายพอดีในกรอบ ไม่โดน main-content ตัด (pc เป็น
    // full-width ต่างจาก config forms ที่อยู่ใน centered card ปุ่มลอยนอกได้)
    <div className="space-y-4 px-4">
      <FormToolbar
        entity={t("entity")}
        mode={f.mode}
        formId="pc-form"
        isPending={isPending}
        onBack={f.handleBack}
        onCancel={f.handleCancel}
        onEdit={f.handleEdit}
        onDelete={physicalCount ? () => setShowDelete(true) : undefined}
        deleteIsPending={deletePc.isPending}
        // ไม่ส่ง label เพราะ pc-edit-content cast `PhysicalCountData`
        // เป็น `PhysicalCount` — ฟิลด์ชื่อที่ type ประกาศไว้ไม่มีอยู่จริงตอนรัน
        activity={physicalCount && { id: physicalCount.id }}
      >
        {f.mode === "view" && physicalCount?.id && (
          <PrintDocumentButton
            documentType="PC"
            documentId={physicalCount.id}
          />
        )}
      </FormToolbar>

      <form
        id="pc-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <PcGeneralFields form={form} disabled={isDisabled} />
      </form>

      <DiscardDialog {...f.discard.dialogProps} variant="warning" />

      <DiscardDialog
        open={f.navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) f.navGuard.cancel();
        }}
        onConfirm={f.navGuard.confirm}
        onCancel={f.navGuard.cancel}
        variant="warning"
      />

      {physicalCount && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deletePc.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm")}
          isPending={deletePc.isPending}
          onConfirm={() => {
            deletePc.mutate(physicalCount.id, {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                f.backToList();
              },
            });
          }}
        />
      )}
    </div>
  );
}
