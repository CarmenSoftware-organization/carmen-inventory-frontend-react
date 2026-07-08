import { useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import {
  SettingSection,
  SettingSectionSkeleton,
} from "../business-setting/business-setting-ui";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { useDiscardConfirm } from "@/hooks/use-discard-confirm";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import {
  useCreateNotificationTemplate,
  useDeleteNotificationTemplate,
  useUpdateNotificationTemplate,
} from "@/hooks/use-notification-template";
import type { NotificationTemplate } from "@/types/noti-tmpl";
import type { FormMode } from "@/types/form";
import {
  NOTIFICATION_CHANNEL_OPTIONS,
  getDefaultValues,
  mapToPayload,
  notificationTemplateSchema,
  type NotificationTemplateFormValues,
} from "./noti-tmpl-form-schema";

const LIST_PATH = "/system-admin/notification-template";
const FORM_ID = "notification-template-form";

interface NotificationTemplateFormProps {
  readonly template?: NotificationTemplate;
}

/** ฟอร์มสร้าง/ดู/แก้ไข Notification Template รองรับโหมด add/view/edit */
export function NotificationTemplateForm({
  template,
}: NotificationTemplateFormProps) {
  const t = useTranslations("systemAdmin.notificationTemplate");
  const tc = useTranslations("common");
  const tf = useTranslations("form");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const tt = useTranslations("toast");
  const navigate = useNavigate();

  const [mode, setMode] = useState<FormMode>(template ? "view" : "add");
  const isView = mode === "view";
  const isAdd = mode === "add";
  const isEdit = mode === "edit";

  const createMut = useCreateNotificationTemplate();
  const updateMut = useUpdateNotificationTemplate();
  const deleteMut = useDeleteNotificationTemplate();
  const [showDelete, setShowDelete] = useState(false);
  const isPending = createMut.isPending || updateMut.isPending;
  const isDisabled = isView || isPending;

  const form = useForm<NotificationTemplateFormValues>({
    resolver: zodResolver(
      notificationTemplateSchema,
    ) as Resolver<NotificationTemplateFormValues>,
    defaultValues: getDefaultValues(template),
  });
  const errors = form.formState.errors;

  const discard = useDiscardConfirm({
    isDirty: form.formState.isDirty,
    isPending,
  });

  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedActive = useWatch({ control: form.control, name: "is_active" });
  const title = isAdd ? t("add") : watchedName || t("untitled");

  const onSubmit = (values: NotificationTemplateFormValues) => {
    const payload = mapToPayload(values);
    if (isEdit && template) {
      updateMut.mutate(
        // doc_version round-trips the loaded record's version — backend requires it for optimistic-concurrency on update
        { id: template.id, doc_version: template.doc_version, ...payload },
        {
          onSuccess: () => {
            toast.success(tt("updateSuccess", { entity: t("entity") }));
            navigate(LIST_PATH);
          },
          onError: (err) => toast.error(err.message),
        },
      );
      return;
    }
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(tt("createSuccess", { entity: t("entity") }));
        navigate(LIST_PATH);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleBack = () => {
    if (isView) {
      navigate(LIST_PATH);
      return;
    }
    discard.confirm(() => navigate(LIST_PATH));
  };

  const handleCancel = () => {
    discard.confirm(() => {
      if (isEdit && template) {
        form.reset(getDefaultValues(template));
        setMode("view");
      } else {
        navigate(LIST_PATH);
      }
    });
  };

  const handleDelete = () => {
    if (!template) return;
    deleteMut.mutate(template.id, {
      onSuccess: () => {
        toast.success(tt("deleteSuccess", { entity: t("entity") }));
        navigate(LIST_PATH);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const pendingLabel = isAdd ? tf("creating") : tf("saving");
  const actionLabel = isAdd ? tc("create") : tc("save");
  const submitLabel = isPending ? pendingLabel : actionLabel;

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-fit"
            type="button"
            aria-label={tc("goBack")}
            onClick={handleBack}
          >
            <ChevronLeft />
          </Button>
          <h1 className="max-w-[20rem] truncate text-lg font-semibold">
            {title}
          </h1>
          {!isAdd && (
            <Badge
              variant={watchedActive ? "success-light" : "warning-light"}
              size="xs"
              className="tracking-wider uppercase"
            >
              {watchedActive ? ts("active") : ts("inactive")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isView ? (
            <Button size="sm" onClick={() => setMode("edit")}>
              <Pencil />
              {tc("edit")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X />
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                form={FORM_ID}
                disabled={isPending}
              >
                <Save />
                {submitLabel}
              </Button>
              {isEdit && template && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  disabled={deleteMut.isPending || isPending}
                >
                  <Trash2 />
                  {tc("delete")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <form
        id={FORM_ID}
        onSubmit={form.handleSubmit(onSubmit, () =>
          scrollToFirstInvalidField(),
        )}
      >
        {/* Section: General */}
        <SettingSection
          first
          title={t("sectionGeneralTitle")}
          description={t("sectionGeneralDesc")}
        >
          <Field>
            <FieldLabel htmlFor="nt-name" required>
              {tfl("name")}
            </FieldLabel>
            <FieldInput
              id="nt-name"
              placeholder={t("namePlaceholder")}
              disabled={isDisabled}
              maxLength={100}
              error={errors.name?.message}
              {...form.register("name")}
            />
          </Field>

          <Field>
            <FieldLabel required>{t("colChannel")}</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <FieldSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("selectChannel")}
                  disabled={isDisabled}
                  error={errors.type?.message}
                >
                  <SelectContent>
                    {NOTIFICATION_CHANNEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </FieldSelect>
              )}
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="nt-description">
              {tfl("description")}
            </FieldLabel>
            <Textarea
              id="nt-description"
              placeholder={tfl("optional")}
              rows={2}
              disabled={isDisabled}
              maxLength={256}
              {...form.register("description")}
            />
          </Field>

          <div className="sm:col-span-2">
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <StatusSwitch
                  id="nt-is-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </SettingSection>

        {/* Section: Message content */}
        <SettingSection
          title={t("sectionMessageTitle")}
          description={t("sectionMessageDesc")}
        >
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="nt-subject">{t("colSubject")}</FieldLabel>
            <FieldInput
              id="nt-subject"
              placeholder={t("subjectPlaceholder")}
              disabled={isDisabled}
              maxLength={200}
              {...form.register("subject")}
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="nt-body" required>
              {t("colBody")}
            </FieldLabel>
            <Textarea
              id="nt-body"
              placeholder={t("bodyPlaceholder")}
              disabled={isDisabled}
              maxLength={259}
              aria-invalid={!!errors.body}
              {...form.register("body")}
            />
            <FieldError>{errors.body?.message}</FieldError>
          </Field>
        </SettingSection>
      </form>

      <DiscardDialog {...discard.dialogProps} variant="warning" />

      {template && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={(open) =>
            !open && !deleteMut.isPending && setShowDelete(false)
          }
          title={t("deleteTitle")}
          description={t("deleteConfirm", { name: template.name })}
          isPending={deleteMut.isPending}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

/** Loading skeleton that mirrors the form's real layout (header + 2 sections). */
export function NotificationTemplateFormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      {/* General: name · channel · description(textarea) · status */}
      <SettingSectionSkeleton first fields={["half", "half", "tall", "full"]} />
      {/* Message content: subject · body(textarea) */}
      <SettingSectionSkeleton fields={["full", "tall"]} />
    </div>
  );
}
