
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusSwitch } from "@/components/ui/status-switch";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
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

interface UnitDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly unit?: Unit | null;
  readonly onSuccess?: (id: string) => void;
  /** view-only mode: disable form + hide save */
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Unit (หน่วยนับ) — premium ERP design
 *
 * มี icon-beside-title header + primary accent strip + gradient overlay
 * รองรับทั้ง create (unit ไม่มี) และ edit (มี unit) โดย reset form ตาม unit prop
 */
export function UnitDialog({
  open,
  onOpenChange,
  unit,
  onSuccess,
  readOnly,
}: UnitDialogProps) {
  const isEdit = !!unit;
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const isPending = createUnit.isPending || updateUnit.isPending;
  const t = useTranslations("config.unit");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const unitSchema = createUnitSchema(tv, tfl);
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema) as Resolver<UnitFormValues>,
    defaultValues: { name: "", description: "", is_active: true },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        unit
          ? {
              name: unit.name,
              description: unit.description,
              is_active: unit.is_active,
            }
          : { name: "", description: "", is_active: true },
      );
    }
  }, [open, unit, form]);

  const onSubmit = (values: UnitFormValues) => {
    const payload = {
      name: values.name,
      description: values.description ?? "",
      is_active: values.is_active,
    };

    if (isEdit) {
      updateUnit.mutate(
        // doc_version round-trips the loaded record's version — the backend
        // requires it on update for optimistic concurrency (omitting it → 400).
        { id: unit.id, doc_version: unit.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createUnit.mutate(payload, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (res: any) => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
          if (res?.id) onSuccess?.(res.id);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const submitLabel = isPending
    ? isEdit
      ? tf("saving")
      : tf("creating")
    : isEdit
      ? tc("save")
      : tc("create");

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit(onSubmit)(e);
          }}
        >
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Ruler className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base">
                  {isEdit
                    ? tf("editTitle", { entity: t("entity") })
                    : tf("addTitle", { entity: t("entity") })}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 border-t px-5 py-4">
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="unit-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="unit-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
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
                  disabled={isPending || readOnly}
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
                    disabled={isPending || readOnly}
                  />
                )}
              />
            </FieldGroup>
          </div>

          <DialogFooter className="bg-muted/20 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {readOnly ? tc("close") : tc("cancel")}
            </Button>
            {!readOnly && (
              <Button type="submit" size="default" disabled={isPending}>
                {submitLabel}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
