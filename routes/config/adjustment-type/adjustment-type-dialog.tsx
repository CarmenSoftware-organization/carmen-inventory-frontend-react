
import { useEffect } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Replace } from "lucide-react";
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
  FieldSelect,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  useCreateAdjustmentType,
  useUpdateAdjustmentType,
} from "@/hooks/use-adjustment-type";
import {
  ADJUSTMENT_TYPE,
  ADJUSTMENT_TYPE_OPTIONS,
  adjustmentTypeSchema,
  type AdjustmentType,
  type AdjustmentTypeFormValues,
} from "@/types/adjustment-type";

interface AdjustmentTypeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly adjustmentType?: AdjustmentType | null;
  readonly readOnly?: boolean;
}

export function AdjustmentTypeDialog({
  open,
  onOpenChange,
  adjustmentType,
  readOnly,
}: AdjustmentTypeDialogProps) {
  const isEdit = !!adjustmentType;
  const createAdjustmentType = useCreateAdjustmentType();
  const updateAdjustmentType = useUpdateAdjustmentType();
  const isPending =
    createAdjustmentType.isPending || updateAdjustmentType.isPending;
  const t = useTranslations("config.adjustmentType");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");

  const form = useForm<AdjustmentTypeFormValues>({
    resolver: zodResolver(
      adjustmentTypeSchema,
    ) as Resolver<AdjustmentTypeFormValues>,
    defaultValues: {
      code: "",
      name: "",
      type: ADJUSTMENT_TYPE.STOCK_IN,
      description: "",
      note: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        adjustmentType
          ? {
              code: adjustmentType.code,
              name: adjustmentType.name,
              type: adjustmentType.type,
              description: adjustmentType.description,
              note: adjustmentType.note,
              is_active: adjustmentType.is_active,
            }
          : {
              code: "",
              name: "",
              type: ADJUSTMENT_TYPE.STOCK_IN,
              description: "",
              note: "",
              is_active: true,
            },
      );
    }
  }, [open, adjustmentType, form]);

  const onSubmit = (values: AdjustmentTypeFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      type: values.type,
      description: values.description ?? "",
      note: values.note ?? "",
      is_active: values.is_active,
    };

    if (isEdit) {
      updateAdjustmentType.mutate(
        // doc_version is the optimistic-concurrency token the backend requires
        // on update; omitting it yields a 400 "doc_version: Required".
        { id: adjustmentType.id, doc_version: adjustmentType.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createAdjustmentType.mutate(payload, {
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit(onSubmit)(e);
          }}
          className="relative"
        >
          <DialogHeader className="gap-0 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Replace className="size-4.5" />
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
                <FieldLabel htmlFor="adjustment-type-code" required>
                  {tfl("code")}
                </FieldLabel>
                <FieldInput
                  id="adjustment-type-code"
                  placeholder={t("codePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.code?.message}
                  maxLength={10}
                  {...form.register("code")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="adjustment-type-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="adjustment-type-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Field>
                <FieldLabel required>{tfl("type")}</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FieldSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isPending || readOnly}
                      error={form.formState.errors.type?.message}
                      placeholder={tfl("selectType")}
                      className="h-8 text-sm"
                    >
                      <SelectContent>
                        {ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </FieldSelect>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="adjustment-type-description">
                  {tfl("description")}
                </FieldLabel>
                <Textarea
                  id="adjustment-type-description"
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
                    id="adjustment-type-is-active"
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
