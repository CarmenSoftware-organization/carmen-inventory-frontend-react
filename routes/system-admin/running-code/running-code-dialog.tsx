
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Braces } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  useCreateRunningCode,
  useUpdateRunningCode,
} from "@/hooks/use-running-code";
import type { RunningCode } from "@/types/running-code";
import {
  createRunningCodeSchema,
  type RunningCodeFormValues,
  getDefaultValues,
} from "./running-code-form-schema";

interface RunningCodeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly runningCode?: RunningCode | null;
}

/**
 * Dialog สำหรับเพิ่ม/แก้ไข Running Code พร้อมช่องกรอก JSON config และปุ่ม format JSON
 * @param props - สถานะ open, callback onOpenChange และข้อมูล runningCode สำหรับโหมดแก้ไข
 * @returns React element ของ Dialog
 * @example
 * <RunningCodeDialog open={open} onOpenChange={setOpen} runningCode={editRc} />
 */
export function RunningCodeDialog({
  open,
  onOpenChange,
  runningCode,
}: RunningCodeDialogProps) {
  const isEdit = !!runningCode;
  const createRunningCode = useCreateRunningCode();
  const updateRunningCode = useUpdateRunningCode();
  const isPending = createRunningCode.isPending || updateRunningCode.isPending;
  const t = useTranslations("systemAdmin.runningCode");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const handleFormatJson = () => {
    const raw = form.getValues("config");
    if (!raw?.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      form.setValue("config", JSON.stringify(parsed, null, 2), {
        shouldDirty: true,
      });
    } catch {
      toast.error(tv("invalidJson", { field: "config" }));
    }
  };

  const runningCodeSchema = createRunningCodeSchema(tv, tfl);
  const form = useForm<RunningCodeFormValues>({
    resolver: zodResolver(runningCodeSchema) as Resolver<RunningCodeFormValues>,
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(runningCode ?? undefined));
    }
  }, [open, runningCode, form]);

  const onSubmit = (values: RunningCodeFormValues) => {
    const payload = {
      type: values.type,
      config: values.config ? JSON.parse(values.config) : {},
      note: values.note,
    };

    if (isEdit) {
      updateRunningCode.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: runningCode.id, doc_version: runningCode.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createRunningCode.mutate(payload, {
        onSuccess: () => {
          toast.success(tt("createSuccess", { entity: t("entity") }));
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader className="gap-0 pb-1">
          <DialogTitle className="text-sm">
            {isEdit
              ? tf("editTitle", { entity: t("entity") })
              : tf("addTitle", { entity: t("entity") })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup className="gap-3">
            <Field data-invalid={!!form.formState.errors.type}>
              <FieldLabel htmlFor="rc-type" className="text-xs" required>
                {tfl("type")}
              </FieldLabel>
              <Input
                id="rc-type"
                placeholder={t("typePlaceholder")}
                className="h-8"
                disabled={isPending || isEdit}
                readOnly={isEdit}
                maxLength={100}
                {...form.register("type")}
              />
              <FieldError>{form.formState.errors.type?.message}</FieldError>
            </Field>

            <Field data-invalid={!!form.formState.errors.config}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="rc-config" className="text-xs">
                  {tfl("config")}
                </FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleFormatJson}
                  disabled={isPending}
                  aria-label="Format JSON"
                >
                  <Braces aria-hidden="true" />
                  Format
                </Button>
              </div>
              <Textarea
                id="rc-config"
                placeholder='e.g. {"key": "value"}'
                className="min-h-24 text-xs"
                rows={4}
                disabled={isPending}
                maxLength={256}
                {...form.register("config")}
              />
              <FieldError>{form.formState.errors.config?.message}</FieldError>
            </Field>

            <Field data-invalid={!!form.formState.errors.note}>
              <FieldLabel htmlFor="rc-note" className="text-xs">
                {tfl("note")}
              </FieldLabel>
              <Textarea
                id="rc-note"
                placeholder={t("notePlaceholder")}
                className="min-h-13 text-xs"
                rows={2}
                disabled={isPending}
                maxLength={256}
                {...form.register("note")}
              />
              <FieldError>{form.formState.errors.note?.message}</FieldError>
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
