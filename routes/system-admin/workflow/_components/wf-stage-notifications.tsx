
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { LookupNotificationTemplate } from "@/components/lookup/lookup-noti-tmpl";
import type { Stage } from "@/types/workflows";
import type { WorkflowCreateModel } from "./wf-form-schema";

type WfAction = "submit" | "approve" | "reject" | "sendback";
type WfRecipient = "requestor" | "current_approve" | "next_step";
type WfChannel = "app" | "email";

interface WfStageNotificationsProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isMiddle: boolean;
  readonly isDisabled: boolean;
  readonly watchedStage: Stage | undefined;
}

export function WfStageNotifications({
  form,
  index,
  isFirst,
  isMiddle,
  isDisabled,
  watchedStage,
}: WfStageNotificationsProps) {
  const t = useTranslations("systemAdmin.workflow");

  return (
    <>
      {watchedStage?.available_actions.submit.is_active && (
        <NotificationSection
          form={form}
          index={index}
          action="submit"
          actionKey="actionSubmit"
          isDisabled={isDisabled}
          showNextStep
        />
      )}

      {!isFirst && watchedStage?.available_actions.approve.is_active && (
        <NotificationSection
          form={form}
          index={index}
          action="approve"
          actionKey="actionApprove"
          isDisabled={isDisabled}
          showNextStep
        />
      )}

      {!isFirst && watchedStage?.available_actions.reject.is_active && (
        <NotificationSection
          form={form}
          index={index}
          action="reject"
          actionKey="actionReject"
          isDisabled={isDisabled}
        />
      )}

      {!isFirst && watchedStage?.available_actions.sendback.is_active && (
        <NotificationSection
          form={form}
          index={index}
          action="sendback"
          actionKey="actionSendBack"
          isDisabled={isDisabled}
        />
      )}

      {isMiddle && (
        <div className="space-y-1.5 rounded border p-2">
          <span className="text-xs font-medium">{t("slaWarning")}</span>
          <div className="space-y-1">
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name={`data.stages.${index}.sla_warning_notification.recipients.requestor`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                )}
              />
              <FieldLabel>{t("requester")}</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Controller
                control={form.control}
                name={`data.stages.${index}.sla_warning_notification.recipients.current_approve`}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={isDisabled}
                  />
                )}
              />
              <FieldLabel>{t("currentApprover")}</FieldLabel>
            </Field>
          </div>
        </div>
      )}

      {!watchedStage?.available_actions.submit.is_active &&
        (isFirst ||
          (!watchedStage?.available_actions.approve.is_active &&
            !watchedStage?.available_actions.reject.is_active &&
            !watchedStage?.available_actions.sendback.is_active)) &&
        !isMiddle && (
          <p className="text-muted-foreground py-3 text-xs">
            {t("noActiveActions")}
          </p>
        )}
    </>
  );
}

interface NotificationSectionProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly action: WfAction;
  readonly actionKey: string;
  readonly isDisabled: boolean;
  readonly showNextStep?: boolean;
}

function NotificationSection({
  form,
  index,
  action,
  actionKey,
  isDisabled,
  showNextStep,
}: NotificationSectionProps) {
  const t = useTranslations("systemAdmin.workflow");

  return (
    <div className="space-y-2 rounded border p-2">
      <span className="text-xs font-medium">{t(actionKey)}</span>
      <div className="space-y-2">
        <RecipientRow
          form={form}
          index={index}
          action={action}
          recipient="requestor"
          label={t("requester")}
          isDisabled={isDisabled}
        />
        <RecipientRow
          form={form}
          index={index}
          action={action}
          recipient="current_approve"
          label={
            action === "reject" ? t("previousApprovers") : t("currentApprover")
          }
          isDisabled={isDisabled}
        />
        {showNextStep && (
          <RecipientRow
            form={form}
            index={index}
            action={action}
            recipient="next_step"
            label={t("nextApprover")}
            isDisabled={isDisabled}
          />
        )}
      </div>
    </div>
  );
}

interface RecipientRowProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly action: WfAction;
  readonly recipient: WfRecipient;
  readonly label: string;
  readonly isDisabled: boolean;
}

function RecipientRow({
  form,
  index,
  action,
  recipient,
  label,
  isDisabled,
}: RecipientRowProps) {
  const isActive = useWatch({
    control: form.control,
    name: `data.stages.${index}.available_actions.${action}.recipients.${recipient}.is_active`,
  });

  return (
    <div className="space-y-1.5">
      <Field orientation="horizontal">
        <Controller
          control={form.control}
          name={`data.stages.${index}.available_actions.${action}.recipients.${recipient}.is_active`}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isDisabled}
            />
          )}
        />
        <FieldLabel>{label}</FieldLabel>
      </Field>
      {isActive && (
        <div className="space-y-1.5 pl-5">
          <ChannelRow
            form={form}
            index={index}
            action={action}
            recipient={recipient}
            channel="app"
            isDisabled={isDisabled}
          />
          <ChannelRow
            form={form}
            index={index}
            action={action}
            recipient={recipient}
            channel="email"
            isDisabled={isDisabled}
          />
        </div>
      )}
    </div>
  );
}

interface ChannelRowProps {
  readonly form: UseFormReturn<WorkflowCreateModel>;
  readonly index: number;
  readonly action: WfAction;
  readonly recipient: WfRecipient;
  readonly channel: WfChannel;
  readonly isDisabled: boolean;
}

function ChannelRow({
  form,
  index,
  action,
  recipient,
  channel,
  isDisabled,
}: ChannelRowProps) {
  const t = useTranslations("systemAdmin.workflow");
  const channelLabel = channel === "app" ? t("channelApp") : t("channelEmail");
  const channelActive = useWatch({
    control: form.control,
    name: `data.stages.${index}.available_actions.${action}.recipients.${recipient}.notification_channel.${channel}.is_active`,
  });

  return (
    <div className="flex items-center gap-2">
      <Controller
        control={form.control}
        name={`data.stages.${index}.available_actions.${action}.recipients.${recipient}.notification_channel.${channel}.is_active`}
        render={({ field }) => (
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={isDisabled}
          />
        )}
      />
      <span className="text-muted-foreground w-12 shrink-0 text-[0.6875rem] font-medium">
        {channelLabel}
      </span>
      <Controller
        control={form.control}
        name={`data.stages.${index}.available_actions.${action}.recipients.${recipient}.notification_channel.${channel}.notification_template_id`}
        render={({ field }) => (
          <LookupNotificationTemplate
            value={field.value}
            onValueChange={field.onChange}
            channelType={channel}
            disabled={isDisabled || !channelActive}
            className="flex-1"
          />
        )}
      />
    </div>
  );
}
