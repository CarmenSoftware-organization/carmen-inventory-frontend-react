import { Controller } from "react-hook-form";
import { z } from "zod";
import { Ruler } from "lucide-react";
import { useTranslations } from "use-intl";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ConfigEntityDialog } from "@/components/templates/config-entity-dialog";
import { useCreateUnit, useUpdateUnit } from "@/hooks/use-unit";
import type { Unit } from "@/types/unit";
import type { TranslationFn } from "@/lib/i18n-schema";

const createUnitSchema = (tv: TranslationFn, tf: TranslationFn) => {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    is_active: z.boolean(),
  });
};

type UnitFormValues = z.infer<ReturnType<typeof createUnitSchema>>;
type UnitPayload = { name: string; description: string; is_active: boolean };

interface UnitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly unit?: Unit | null;
  readonly onSuccess?: (id: string) => void;
  /** view-only mode: disable form + hide save */
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Unit (หน่วยนับ)
 *
 * ใช้ `ConfigEntityDialog` เหมือน config dialog อื่น เพิ่ม `onCreated` เพื่อส่ง
 * id ของ unit ที่เพิ่งสร้างกลับ (flow สร้าง inline แล้วเลือกทันที) และ
 * `stopPropagationOnSubmit` กัน submit ทะลุ form แม่ที่เปิด dialog นี้
 */
export function UnitDialog({
  open,
  onOpenChange,
  unit,
  onSuccess,
  readOnly,
}: UnitDialogProps) {
  const t = useTranslations("config.unit");
  const tfl = useTranslations("field");

  return (
    <ConfigEntityDialog<Unit, UnitFormValues, UnitPayload>
      open={open}
      onOpenChange={onOpenChange}
      entity={unit}
      readOnly={readOnly}
      icon={Ruler}
      translationNamespace="config.unit"
      useCreate={useCreateUnit}
      useUpdate={useUpdateUnit}
      buildSchema={createUnitSchema}
      stopPropagationOnSubmit
      onCreated={(res) => {
        const created = res as { id?: string } | undefined;
        if (created?.id) onSuccess?.(created.id);
      }}
      toFormValues={(e) =>
        e
          ? { name: e.name, description: e.description, is_active: e.is_active }
          : { name: "", description: "", is_active: true }
      }
      toPayload={(v) => ({
        name: v.name,
        description: v.description ?? "",
        is_active: v.is_active,
      })}
    >
      {({ form, disabled }) => (
        <>
          <Field>
            <FieldLabel htmlFor="unit-name" required>
              {tfl("name")}
            </FieldLabel>
            <FieldInput
              id="unit-name"
              placeholder={t("namePlaceholder")}
              className="h-8"
              disabled={disabled}
              error={form.formState.errors.name?.message}
              maxLength={100}
              {...form.register("name")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="unit-description">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="unit-description"
              placeholder={tfl("optional")}
              className="h-8"
              disabled={disabled}
              maxLength={256}
              {...form.register("description")}
            />
          </Field>

          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="unit-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </>
      )}
    </ConfigEntityDialog>
  );
}
