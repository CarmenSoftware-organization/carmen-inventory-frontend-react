import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
} from "@/types/noti-tmpl";

const crud = createConfigCrud<
  NotificationTemplate,
  CreateNotificationTemplateDto
>({
  queryKey: QUERY_KEYS.NOTIFICATION_TEMPLATES,
  endpoint: API_ENDPOINTS.NOTIFICATION_TEMPLATES,
  label: "notification template",
});

export const useNotificationTemplates = crud.useList;

export const useNotificationTemplateById = crud.useById;

export const useCreateNotificationTemplate = crud.useCreate;

export const useUpdateNotificationTemplate = crud.useUpdate;

export const useDeleteNotificationTemplate = crud.useDelete;
