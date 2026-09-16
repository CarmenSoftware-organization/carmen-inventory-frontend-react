import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "use-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateInventoryPeriod, useUpdateInventoryPeriod } from "./use-inventory-period";
import type { InventoryPeriod } from "@/types/inventory-period";
import {
  createInventoryPeriodSchema,
  getDefaultValues,
  type InventoryPeriodFormValues,
} from "./inventory-period-form-schema";

interface InventoryInventoryPeriodDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly period?: InventoryPeriod | null;
}

export function InventoryPeriodDialog({
  open,
  onOpenChange,
  period,
}: InventoryInventoryPeriodDialogProps) {
  const isEdit = !!period;
  const createInventoryPeriod = useCreateInventoryPeriod();
  const updateInventoryPeriod = useUpdateInventoryPeriod();
  const isPending = createInventoryPeriod.isPending || updateInventoryPeriod.isPending;
  const t = useTranslations("systemAdmin.inventoryPeriod");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const inventoryPeriodSchema = createInventoryPeriodSchema(tv, tfl);
  const form = useForm<InventoryPeriodFormValues>({
    resolver: zodResolver(inventoryPeriodSchema) as Resolver<InventoryPeriodFormValues>,
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(period));
    }
  }, [open, period, form]);

  const onSubmit = (values: InventoryPeriodFormValues) => {
    const payload = {
      fiscal_year: values.fiscal_year,
      fiscal_month: values.fiscal_month,
      start_at: values.start_at,
      end_at: values.end_at,
      status: values.status,
    };

    if (isEdit) {
      updateInventoryPeriod.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: period.id, doc_version: period.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
        },
      );
    } else {
      createInventoryPeriod.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader className="gap-0 pb-1">
          <DialogTitle className="text-sm">
            {isEdit
              ? tf("editTitle", { entity: t("entity") })
              : tf("addTitle", { entity: t("entity") })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <FieldGroup className="gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field data-invalid={!!form.formState.errors.fiscal_year}>
                <FieldLabel htmlFor="period-fiscal-year" className="text-xs">
                  {t("fiscalYear")}
                </FieldLabel>
                <Input
                  id="period-fiscal-year"
                  type="number"
                  placeholder="e.g. 27"
                  className="h-8"
                  disabled={isPending}
                  {...form.register("fiscal_year")}
                />
                <FieldError>
                  {form.formState.errors.fiscal_year?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.fiscal_month}>
                <FieldLabel htmlFor="period-fiscal-month" className="text-xs">
                  {t("fiscalMonth")}
                </FieldLabel>
                <Input
                  id="period-fiscal-month"
                  type="number"
                  min={1}
                  max={12}
                  placeholder="1-12"
                  className="h-8"
                  disabled={isPending}
                  {...form.register("fiscal_month")}
                />
                <FieldError>
                  {form.formState.errors.fiscal_month?.message}
                </FieldError>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field data-invalid={!!form.formState.errors.start_at}>
                <FieldLabel className="text-xs">{t("startAt")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="start_at"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                      placeholder={t("startAt")}
                      className="w-full"
                    />
                  )}
                />
                <FieldError>
                  {form.formState.errors.start_at?.message}
                </FieldError>
              </Field>

              <Field data-invalid={!!form.formState.errors.end_at}>
                <FieldLabel className="text-xs">{t("endAt")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="end_at"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending}
                      placeholder={t("endAt")}
                      className="w-full"
                    />
                  )}
                />
                <FieldError>{form.formState.errors.end_at?.message}</FieldError>
              </Field>
            </div>

            <Field data-invalid={!!form.formState.errors.status}>
              <FieldLabel htmlFor="period-status" className="text-xs">
                {t("status")}
              </FieldLabel>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isPending}
                  >
                    <SelectTrigger id="period-status" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t("statusOpen")}</SelectItem>
                      <SelectItem value="closed">
                        {t("statusClosed")}
                      </SelectItem>
                      <SelectItem value="locked">
                        {t("statusLocked")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.status?.message}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && isEdit && tf("saving")}
              {isPending && !isEdit && tf("creating")}
              {!isPending && isEdit && tc("save")}
              {!isPending && !isEdit && tc("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
