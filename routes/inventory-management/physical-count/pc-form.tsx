import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
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
import type { FormMode } from "@/types/form";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
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

export function PcForm({ physicalCount }: PcFormProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(physicalCount ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createPc = useCreatePhysicalCount();
  const updatePc = useUpdatePhysicalCount();
  const deletePc = useDeletePhysicalCount();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createPc.isPending || updatePc.isPending;
  const isDisabled = isView || isPending;

  const physicalCountSchema = createPhysicalCountSchema(tv, tfl);
  const defaultValues = getDefaultValues(physicalCount);

  const form = useForm<PhysicalCountFormValues>({
    resolver: zodResolver(
      physicalCountSchema,
    ) as Resolver<PhysicalCountFormValues>,
    defaultValues,
  });

  // guard สองตัวต้องอ่าน dirty ค่าเดียวกัน ไม่งั้นปุ่ม Back ถามแต่เมนู sidebar เงียบ
  const isFormDirty = form.formState.isDirty;

  const discard = useDiscardConfirm({
    isDirty: isFormDirty,
    isPending,
  });

  // ระหว่าง submit ตอน create ปิด guard — ไม่งั้น sentinel ที่ guard ดันไว้ที่ /new
  // ค้างอยู่ใน history stack หลัง navigate ออกไป กด back แล้วเจอ /new ซ้ำ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useDiscardConfirm ดักได้แค่ปุ่มในฟอร์มเอง (Cancel/Back) — ลิงก์ข้างนอกอย่าง
  // เมนู sidebar ต้องใช้ตัวนี้ดัก ไม่งั้นกดแล้วหลุดออกไปพร้อมข้อมูลที่ยังไม่ได้เซฟ
  const navGuard = useNavigationGuard(
    (isAdd || isEdit) && isFormDirty && !isSubmitting,
  );

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
            setMode("view");
          },
        },
      );
    } else if (isAdd) {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      createPc.mutate(payload, {
        onError: () => setIsSubmitting(false),
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/inventory-management/physical-count");
        },
      });
    }
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && physicalCount) {
        form.reset(defaultValues);
        setMode("view");
      } else {
        navigate("/inventory-management/physical-count");
      }
    });
  };

  // Back = กลับหน้า list เสมอ ไม่ใช่ history back — จากหน้า detail ผู้ใช้เดินไปใบอื่น
  // ได้ (ปุ่ม ↑↓ ของ DocSequenceNav) history จึงเป็นเส้นทางที่เดินผ่านมา ไม่ใช่ที่ที่
  // อยากกลับไป กดครั้งเดียวต้องถึง list ไม่ใช่ถอยทีละใบ
  const goBack = () => {
    navigate("/inventory-management/physical-count");
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  return (
    // px-4 ให้ทั้ง header+form มี gutter ซ้าย — FormToolbar flush (title ตรง form
    // body) และปุ่ม back hang ออกซ้ายพอดีในกรอบ ไม่โดน main-content ตัด (pc เป็น
    // full-width ต่างจาก config forms ที่อยู่ใน centered card ปุ่มลอยนอกได้)
    <div className="space-y-4 px-4">
      <FormToolbar
        entity={t("entity")}
        mode={mode}
        formId="pc-form"
        isPending={isPending}
        onBack={handleBack}
        onCancel={handleCancel}
        onEdit={() => setMode("edit")}
        onDelete={physicalCount ? () => setShowDelete(true) : undefined}
        deleteIsPending={deletePc.isPending}
        // ไม่ส่ง label เพราะ pc-edit-content cast `PhysicalCountData`
        // เป็น `PhysicalCount` — ฟิลด์ชื่อที่ type ประกาศไว้ไม่มีอยู่จริงตอนรัน
        activity={physicalCount && { id: physicalCount.id }}
      >
        {mode === "view" && physicalCount?.id && (
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
                navigate("/inventory-management/physical-count");
              },
            });
          }}
        />
      )}
    </div>
  );
}
