
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { toast } from "sonner";
import {
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from "@/hooks/use-equipment";
import type { Equipment } from "@/types/equipment";
import type { FormMode } from "@/types/form";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  createEquipmentSchema,
  getDefaultValues,
  type EquipmentFormValues,
} from "./eq-form-schema";
import { EqToolbar } from "./eq-toolbar";
import { EqGeneralSection } from "./eq-general-section";
import type { EqImageChange } from "./eq-image-field";
import { EqQuantitySection } from "./eq-quantity-section";
import { EqInstructionsSection } from "./eq-instructions-section";
import { EqMaintenanceSection } from "./eq-maintenance-section";
import { EqAdditionalSection } from "./eq-additional-section";

interface EquipmentFormProps {
  readonly equipment?: Equipment;
}

/**
 * ฟอร์มสร้างและแก้ไขข้อมูลอุปกรณ์ รองรับโหมด view/edit/add
 */
export function EquipmentForm({ equipment }: EquipmentFormProps) {
  const t = useTranslations("operationPlan.equipment");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>(equipment ? "view" : "add");
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd = mode === "add";

  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const [showDelete, setShowDelete] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const isPending = createEquipment.isPending || updateEquipment.isPending;
  const isDisabled = isView || isPending;

  const resetImage = () => {
    setImageFile(null);
    setImageRemoved(false);
  };

  const handleImageChange = ({ file, removed }: EqImageChange) => {
    setImageFile(file);
    setImageRemoved(removed);
  };

  const equipmentSchema = createEquipmentSchema(tv, tfl);
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema) as Resolver<EquipmentFormValues>,
    defaultValues: getDefaultValues(equipment),
  });

  const isImageDirty = imageFile !== null || imageRemoved;
  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty || isImageDirty,
    isPending,
  });

  const onSubmit = (values: EquipmentFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      category_id: values.category_id,
      brand: values.brand || null,
      model: values.model || null,
      serial_no: values.serial_no || null,
      capacity: values.capacity || null,
      power_rating: values.power_rating || null,
      station: values.station || null,
      operation_instructions: values.operation_instructions || null,
      safety_notes: values.safety_notes || null,
      cleaning_instructions: values.cleaning_instructions || null,
      maintenance_schedule: values.maintenance_schedule || null,
      last_maintenance_date: values.last_maintenance_date || null,
      next_maintenance_date: values.next_maintenance_date || null,
      note: values.note || null,
      is_active: values.is_active,
      is_portable: values.is_portable,
      available_qty: values.available_qty,
      total_qty: values.total_qty,
      usage_count: values.usage_count,
      average_usage_time: values.average_usage_time,
    };

    if (isEdit && equipment) {
      updateEquipment.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: equipment.id, doc_version: equipment.doc_version, ...payload, image: imageFile, remove_image: imageRemoved },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            resetImage();
            // reset baseline ให้ isDirty กลับเป็น false — ไม่งั้น discard dialog
            // จะเด้งตอน Cancel ทั้งที่ผู้ใช้ save ไปแล้ว
            form.reset(values);
            setMode("view");
          },
        },
      );
    } else {
      createEquipment.mutate(
        { ...payload, image: imageFile },
        {
          onSuccess: () => {
            toast.success(tt("createSuccess", { entity: t("entity") }));
            resetImage();
            // navigate กลับ list เหมือน form อื่นใน operation-plan — ถ้าค้างที่หน้า
            // /new toolbar จะโชว์ Edit แล้วกด Save อีกครั้งจะ create ซ้ำ (equipment
            // prop ยัง undefined)
            navigate("/operation-plan/equipment");
          },
        },
      );
    }
  };

  const handleBack = () => {
    if (isEdit || isAdd) {
      discard.confirm(() => navigate("/operation-plan/equipment"));
    } else {
      navigate("/operation-plan/equipment");
    }
  };

  const handleEdit = () => setMode("edit");

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && equipment) {
        form.reset(getDefaultValues(equipment));
        resetImage();
        setMode("view");
      } else {
        navigate("/operation-plan/equipment");
      }
    });
  };

  const handleDelete = () => {
    if (!equipment) return;
    deleteEquipment.mutate(equipment.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate("/operation-plan/equipment");
      },
    });
  };

  return (
    <div className="space-y-4">
      <EqToolbar
        form={form}
        mode={mode}
        isPending={isPending}
        isDeleting={deleteEquipment.isPending}
        onBack={handleBack}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onDelete={equipment ? () => setShowDelete(true) : undefined}
      />

      <form
        id="equipment-form"
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
        className="space-y-4"
      >
        <EqGeneralSection
          form={form}
          isDisabled={isDisabled}
          imageUrl={equipment?.image_url}
          imageFile={imageFile}
          imageRemoved={imageRemoved}
          onImageChange={handleImageChange}
        />
        <EqQuantitySection form={form} isDisabled={isDisabled} />
        <EqInstructionsSection form={form} isDisabled={isDisabled} />
        <EqMaintenanceSection form={form} isDisabled={isDisabled} />
        <EqAdditionalSection form={form} isDisabled={isDisabled} />
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {equipment && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteEquipment.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: equipment.name })}
          isPending={deleteEquipment.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
