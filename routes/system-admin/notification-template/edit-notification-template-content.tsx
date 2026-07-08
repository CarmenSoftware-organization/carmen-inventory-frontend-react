
import { useTranslations } from "use-intl";
import { ErrorState } from "@/components/ui/error-state";
import { useNotificationTemplateById } from "@/hooks/use-notification-template";
import {
  NotificationTemplateForm,
  NotificationTemplateFormSkeleton,
} from "./noti-tmpl-form";

export function NotiTmplDetailContent({ id }: { readonly id: string }) {
  const tc = useTranslations("common");
  const { data, isLoading, error, refetch } = useNotificationTemplateById(id);

  if (isLoading) return <NotificationTemplateFormSkeleton />;
  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }
  if (!data) return <ErrorState message={tc("noDataFound")} />;

  return <NotificationTemplateForm template={data} />;
}
