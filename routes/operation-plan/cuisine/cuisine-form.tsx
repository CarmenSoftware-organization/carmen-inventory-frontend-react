import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { toast } from "sonner";
import {
  useCreateCuisine,
  useUpdateCuisine,
  useDeleteCuisine,
} from "@/hooks/use-cuisine";
import type { Cuisine } from "@/types/cuisine";
import type { FormMode } from "@/types/form";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  cuisineSchema,
  getDefaultValues,
  mapToPayload,
  type CuisineFormValues,
} from "./cuisine-form-schema";
import { CuisineToolbar } from "./cuisine-toolbar";
import { CuisineGeneralFields } from "./cuisine-general-fields";
import { CuisineDetailFields } from "./cuisine-detail-fields";
import { CuisineAdditionalFields } from "./cuisine-additional-fields";

interface CuisineFormProps {
  readonly cuisine?: Cuisine;
}

/**
 * ฟอร์มสำหรับสร้างและแก้ไขข้อมูล cuisine รองรับโหมด view/edit/add
 */
export function CuisineForm({ cuisine }: CuisineFormProps) {
  const t = useTranslations("operationPlan.cuisine");
  const tt = useTranslations("toast");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(cuisine ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createCuisine = useCreateCuisine();
  const updateCuisine = useUpdateCuisine();
  const deleteCuisine = useDeleteCuisine();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createCuisine.isPending || updateCuisine.isPending;
  const isDisabled = isView || isPending;

  const form = useForm<CuisineFormValues>({
    resolver: zodResolver(cuisineSchema) as Resolver<CuisineFormValues>,
    defaultValues: getDefaultValues(cuisine),
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

  const onSubmit = (values: CuisineFormValues) => {
    const payload = mapToPayload(values);

    if (isEdit && cuisine) {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      updateCuisine.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: cuisine.id, doc_version: cuisine.doc_version, ...payload },
        {
          onError: () => setIsSubmitting(false),
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate("/operation-plan/cuisine");
          },
        },
      );
    } else {
      // ปิด guard ก่อนยิง mutation → sentinel ถูก teardown ลบระหว่างรอ network
      setIsSubmitting(true);
      createCuisine.mutate(payload, {
        onError: () => setIsSubmitting(false),
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          navigate("/operation-plan/cuisine");
        },
      });
    }
  };

  // Back = กลับหน้า list เสมอ ไม่ใช่ history back — จากหน้า detail ผู้ใช้เดินไปใบอื่น
  // ได้ (ปุ่ม ↑↓ ของ DocSequenceNav) history จึงเป็นเส้นทางที่เดินผ่านมา ไม่ใช่ที่ที่
  // อยากกลับไป กดครั้งเดียวต้องถึง list ไม่ใช่ถอยทีละใบ
  const goBack = () => {
    navigate("/operation-plan/cuisine");
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(goBack);
    } else {
      goBack();
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && cuisine) {
        form.reset(getDefaultValues(cuisine));
        setMode("view");
      } else {
        navigate("/operation-plan/cuisine");
      }
    });
  };

  const handleDelete = () => {
    if (!cuisine) return;
    deleteCuisine.mutate(cuisine.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/operation-plan/cuisine");
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-[max(1rem,env(safe-area-inset-bottom))]">
      <CuisineToolbar
        form={form}
        mode={mode}
        isPending={isPending}
        isDeleting={deleteCuisine.isPending}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={cuisine ? () => setShowDelete(true) : undefined}
        activityId={cuisine?.id}
      />

      <form
        id="cuisine-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        <CuisineGeneralFields form={form} isDisabled={isDisabled} />
        <CuisineDetailFields form={form} isDisabled={isDisabled} />
        <CuisineAdditionalFields form={form} isDisabled={isDisabled} />
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

      {cuisine && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteCuisine.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: cuisine.name })}
          isPending={deleteCuisine.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
