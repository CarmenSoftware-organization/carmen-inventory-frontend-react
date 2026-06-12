
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Award } from "lucide-react";
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
import {
  useCreateCertification,
  useUpdateCertification,
} from "@/hooks/use-certification";
import {
  createCertificationSchema,
  getDefaultValues,
  type CertificationFormValues,
} from "./certification-form-schema";
import type { Certification } from "@/types/certification";

interface CertificationDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly certification?: Certification | null;
  readonly readOnly?: boolean;
}

export function CertificationDialog({
  open,
  onOpenChange,
  certification,
  readOnly,
}: CertificationDialogProps) {
  const isEdit = !!certification;
  const createCertification = useCreateCertification();
  const updateCertification = useUpdateCertification();
  const isPending =
    createCertification.isPending || updateCertification.isPending;
  const t = useTranslations("config.certification");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const certificationSchema = createCertificationSchema(tv, tfl);
  const form = useForm<CertificationFormValues>({
    resolver: zodResolver(
      certificationSchema,
    ) as Resolver<CertificationFormValues>,
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(certification ?? undefined));
    }
  }, [open, certification, form]);

  const onSubmit = (values: CertificationFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description ?? "",
      is_active: values.is_active,
    };

    if (isEdit) {
      updateCertification.mutate(
        { id: certification.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCertification.mutate(payload, {
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
                <Award className="size-4.5" />
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
                <FieldLabel htmlFor="certification-code" required>
                  {tfl("code")}
                </FieldLabel>
                <FieldInput
                  id="certification-code"
                  placeholder={t("codePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.code?.message}
                  maxLength={10}
                  {...form.register("code")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="certification-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="certification-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="certification-description">
                  {tfl("description")}
                </FieldLabel>
                <Textarea
                  id="certification-description"
                  placeholder={tfl("optional")}
                  rows={2}
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
                    id="certification-is-active"
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
