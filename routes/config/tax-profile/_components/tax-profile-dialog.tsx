
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Percent } from "lucide-react";
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
import { useTranslations } from "use-intl";
import {
  useCreateTaxProfile,
  useUpdateTaxProfile,
} from "@/hooks/use-tax-profile";
import {
  createTaxProfileSchema,
  EMPTY_FORM,
  type TaxProfileFormValues,
} from "./tax-profile-form-schema";
import type { TaxProfile } from "@/types/tax-profile";

interface TaxProfileDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly taxProfile?: TaxProfile | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Tax Profile — premium ERP design
 *
 * มี icon-beside-title header
 * รองรับทั้ง create (taxProfile ไม่มี) และ edit (มี taxProfile)
 */
export function TaxProfileDialog({
  open,
  onOpenChange,
  taxProfile,
  readOnly,
}: TaxProfileDialogProps) {
  const isEdit = !!taxProfile;
  const createTaxProfile = useCreateTaxProfile();
  const updateTaxProfile = useUpdateTaxProfile();
  const isPending = createTaxProfile.isPending || updateTaxProfile.isPending;
  const t = useTranslations("config.taxProfile");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const taxProfileSchema = createTaxProfileSchema(tv, tfl);
  const form = useForm<TaxProfileFormValues>({
    resolver: zodResolver(taxProfileSchema) as Resolver<TaxProfileFormValues>,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        taxProfile
          ? {
              name: taxProfile.name,
              tax_rate: taxProfile.tax_rate,
              is_active: taxProfile.is_active,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, taxProfile, form]);

  const onSubmit = (values: TaxProfileFormValues) => {
    const payload = {
      name: values.name,
      tax_rate: values.tax_rate,
      is_active: values.is_active,
    };

    if (isEdit) {
      updateTaxProfile.mutate(
        { id: taxProfile.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createTaxProfile.mutate(payload, {
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
                <Percent className="size-4.5" />
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
                <FieldLabel htmlFor="tax-profile-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="tax-profile-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="tax-profile-rate" required>
                  {tfl("taxRate")}
                </FieldLabel>
                <div>
                  <FieldInput
                    id="tax-profile-rate"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder={t("ratePlaceholder")}
                    className="h-8 pr-8 text-right tabular-nums"
                    disabled={isPending || readOnly}
                    error={form.formState.errors.tax_rate?.message}
                    {...form.register("tax_rate", { valueAsNumber: true })}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    %
                  </span>
                </div>
              </Field>

              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <StatusSwitch
                    id="tax-profile-is-active"
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
