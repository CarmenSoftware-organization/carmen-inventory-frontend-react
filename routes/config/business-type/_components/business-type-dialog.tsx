
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase } from "lucide-react";
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
import { toast } from "sonner";
import {
  useCreateBusinessType,
  useUpdateBusinessType,
} from "@/hooks/use-business-type";
import { useTranslations } from "use-intl";
import {
  createBusinessTypeSchema,
  EMPTY_FORM,
  type BusinessTypeFormValues,
} from "./business-type-form-schema";
import type { BusinessType } from "@/types/business-type";

interface BusinessTypeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly businessType?: BusinessType | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Business Type — premium ERP design
 *
 * มี icon-beside-title header
 * รองรับทั้ง create (businessType ไม่มี) และ edit (มี businessType)
 */
export function BusinessTypeDialog({
  open,
  onOpenChange,
  businessType,
  readOnly,
}: BusinessTypeDialogProps) {
  const isEdit = !!businessType;
  const createBusinessType = useCreateBusinessType();
  const updateBusinessType = useUpdateBusinessType();
  const isPending =
    createBusinessType.isPending || updateBusinessType.isPending;
  const t = useTranslations("config.businessType");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const businessTypeSchema = createBusinessTypeSchema(tv, tfl);
  const form = useForm<BusinessTypeFormValues>({
    resolver: zodResolver(
      businessTypeSchema,
    ) as Resolver<BusinessTypeFormValues>,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        businessType
          ? { name: businessType.name, is_active: businessType.is_active }
          : EMPTY_FORM,
      );
    }
  }, [open, businessType, form]);

  const onSubmit = (values: BusinessTypeFormValues) => {
    const payload = {
      name: values.name,
      is_active: values.is_active,
    };

    if (isEdit) {
      updateBusinessType.mutate(
        { id: businessType.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createBusinessType.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
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

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Briefcase className="size-4.5" />
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
                <FieldLabel htmlFor="business-type-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="business-type-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <StatusSwitch
                    id="business-type-is-active"
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
