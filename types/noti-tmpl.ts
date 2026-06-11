export type NotificationTemplateType = "app" | "line" | "sms" | "email";

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationTemplateType;
  subject: string | null;
  body: string;
  description: string;
  is_active: boolean;
}

export interface CreateNotificationTemplateDto {
  name: string;
  type: NotificationTemplateType;
  subject?: string | null;
  body: string;
  description?: string;
  is_active?: boolean;
}
