
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coins } from "lucide-react";
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
  useCreateExtraCost,
  useUpdateExtraCost,
} from "@/hooks/use-extra-cost";
import { useTranslations } from "use-intl";
import {
  createExtraCostSchema,
  EMPTY_FORM,
  type ExtraCostFormValues,
} from "./extra-cost-form-schema";
import type { ExtraCost } from "@/types/extra-cost";

interface ExtraCostDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly extraCost?: ExtraCost | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Extra Cost — premium ERP design
 *
 * มี icon-beside-title header
 * รองรับทั้ง create (extraCost ไม่มี) และ edit (มี extraCost)
 */
export function ExtraCostDialog({
  open,
  onOpenChange,
  extraCost,
  readOnly,
}: ExtraCostDialogProps) {
  const isEdit = !!extraCost;
  const createExtraCost = useCreateExtraCost();
  const updateExtraCost = useUpdateExtraCost();
  const isPending = createExtraCost.isPending || updateExtraCost.isPending;
  const t = useTranslations("config.extraCost");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const extraCostSchema = createExtraCostSchema(tv, tfl);
  const form = useForm<ExtraCostFormValues>({
    resolver: zodResolver(extraCostSchema) as Resolver<ExtraCostFormValues>,
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        extraCost
          ? { name: extraCost.name, is_active: extraCost.is_active }
          : EMPTY_FORM,
      );
    }
  }, [open, extraCost, form]);

  const onSubmit = (values: ExtraCostFormValues) => {
    const payload = {
      name: values.name,
      is_active: values.is_active,
    };

    if (isEdit) {
      updateExtraCost.mutate(
        // doc_version round-trips the loaded record's version — backend requires
        // it on PATCH for optimistic concurrency (omitting it → 400).
        { id: extraCost.id, doc_version: extraCost.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createExtraCost.mutate(payload, {
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
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Coins className="size-4.5" />
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
                <FieldLabel htmlFor="extra-cost-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="extra-cost-name"
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
                    id="extra-cost-is-active"
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
