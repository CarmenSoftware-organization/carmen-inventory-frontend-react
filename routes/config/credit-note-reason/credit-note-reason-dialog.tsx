
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileMinus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  useCreateCnReasonConfig,
  useUpdateCnReasonConfig,
} from "@/hooks/use-cn-reason-config";
import type { CnReason } from "@/types/cn-reason";
import {
  createCnReasonSchema,
  type CnReasonFormValues,
} from "./credit-note-reason-form-schema";

interface CreditNoteReasonDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly reason?: CnReason | null;
  readonly readOnly?: boolean;
}

/**
 * Dialog สร้าง/แก้ไข Credit Note Reason — premium ERP design
 *
 * มี icon-beside-title header
 * รองรับทั้ง create (reason ไม่มี) และ edit (มี reason)
 */
export function CreditNoteReasonDialog({
  open,
  onOpenChange,
  reason,
  readOnly,
}: CreditNoteReasonDialogProps) {
  const isEdit = !!reason;
  const createCnReason = useCreateCnReasonConfig();
  const updateCnReason = useUpdateCnReasonConfig();
  const isPending = createCnReason.isPending || updateCnReason.isPending;
  const t = useTranslations("config.creditNoteReason");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const tv = useTranslations("validation");

  const cnReasonSchema = createCnReasonSchema(tv, tfl);
  const form = useForm<CnReasonFormValues>({
    resolver: zodResolver(cnReasonSchema) as Resolver<CnReasonFormValues>,
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        reason
          ? {
              name: reason.name,
              description: reason.description,
            }
          : { name: "", description: "" },
      );
    }
  }, [open, reason, form]);

  const onSubmit = (values: CnReasonFormValues) => {
    const payload = {
      name: values.name,
      description: values.description ?? "",
    };

    if (isEdit) {
      updateCnReason.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: reason.id, doc_version: reason.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createCnReason.mutate(payload, {
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
                <FileMinus className="size-4.5" />
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
                <FieldLabel htmlFor="cn-reason-name" required>
                  {tfl("name")}
                </FieldLabel>
                <FieldInput
                  id="cn-reason-name"
                  placeholder={t("namePlaceholder")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  error={form.formState.errors.name?.message}
                  maxLength={100}
                  {...form.register("name")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="cn-reason-description">
                  {tfl("description")}
                </FieldLabel>
                <Textarea
                  id="cn-reason-description"
                  placeholder={tfl("optional")}
                  className="h-8"
                  disabled={isPending || readOnly}
                  maxLength={256}
                  {...form.register("description")}
                />
              </Field>
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
