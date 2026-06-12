
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useCreateCreditTerm,
  useUpdateCreditTerm,
} from "@/hooks/use-credit-term";
import type { CreditTerm } from "@/types/credit-term";
import {
  createCreditTermSchema,
  type CreditTermFormValues,
} from "./credit-term-form-schema";

interface CreditTermDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly creditTerm?: CreditTerm | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Credit Term — premium ERP design
 *
 * มี icon-beside-title header
 * รองรับทั้ง create (creditTerm ไม่มี) และ edit (มี creditTerm)
 */
export function CreditTermDialog({
  open,
  onOpenChange,
  creditTerm,
  readOnly,
}: CreditTermDialogProps) {
  const isEdit = !!creditTerm;
  const createCreditTerm = useCreateCreditTerm();
  const updateCreditTerm = useUpdateCreditTerm();
  const isPending = createCreditTerm.isPending || updateCreditTerm.isPending;
  const t = useTranslations("config.creditTerm");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const creditTermSchema = createCreditTermSchema(tv, tfl);
  const form = useForm<CreditTermFormValues>({
    resolver: zodResolver(creditTermSchema) as Resolver<CreditTermFormValues>,
    defaultValues: {
      name: "",
      value: 0,
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        creditTerm
          ? {
              name: creditTerm.name,
              value: creditTerm.value,
              description: creditTerm.description,
              is_active: creditTerm.is_active,
            }
          : {
              name: "",
              value: 0,
              description: "",
              is_active: true,
            },
      );
    }
  }, [open, creditTerm, form]);

  const onSubmit = (values: CreditTermFormValues) => {
    const payload = {
      name: values.name,
      value: values.value,
      description: values.description ?? "",
      is_active: values.is_active,
    };

    if (isEdit) {
      updateCreditTerm.mutate(
        { id: creditTerm.id, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCreditTerm.mutate(payload, {
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
                <CalendarClock className="size-4.5" />
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
                <FieldLabel htmlFor="credit-term-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="credit-term-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="credit-term-value" required>
                  {tfl("creditTermDays")}
                </FieldLabel>
                <div>
                  <Input
                    id="credit-term-value"
                    type="number"
                    inputMode="decimal"
                    placeholder={t("valuePlaceholder")}
                    className="h-8 pr-12 text-right tabular-nums"
                    disabled={isPending || readOnly}
                    {...form.register("value")}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    {t("daysUnit")}
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="credit-term-description">
                  {tfl("description")}
                </FieldLabel>
                <Textarea
                  id="credit-term-description"
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
                    id="credit-term-is-active"
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
