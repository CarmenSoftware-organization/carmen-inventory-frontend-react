import { z } from "zod";
import type {
  CreateNotificationTemplateDto,
  NotificationTemplate,
  NotificationTemplateType,
} from "@/types/noti-tmpl";

/** ตัวเลือกช่องทางการแจ้งเตือน (ใช้ใน FieldSelect) */
export const NOTIFICATION_CHANNEL_OPTIONS: ReadonlyArray<{
  value: NotificationTemplateType;
  label: string;
}> = [
  { value: "app", label: "App" },
  { value: "email", label: "Email" },
  { value: "line", label: "LINE" },
  { value: "sms", label: "SMS" },
];

export const notificationTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["app", "line", "sms", "email"]),
  subject: z.string(),
  body: z.string().min(1, "Body is required"),
  description: z.string(),
  is_active: z.boolean(),
});

export type NotificationTemplateFormValues = z.infer<
  typeof notificationTemplateSchema
>;

export const EMPTY_FORM: NotificationTemplateFormValues = {
  name: "",
  type: "app",
  subject: "",
  body: "",
  description: "",
  is_active: true,
};

/** แปลงข้อมูล template เป็นค่าเริ่มต้นของฟอร์ม */
export function getDefaultValues(
  template?: NotificationTemplate,
): NotificationTemplateFormValues {
  if (!template) return EMPTY_FORM;
  return {
    name: template.name,
    type: template.type,
    subject: template.subject ?? "",
    body: template.body,
    description: template.description ?? "",
    is_active: template.is_active,
  };
}

/** แปลงค่าฟอร์มเป็น payload สำหรับ API (subject ว่าง → null) */
export function mapToPayload(
  values: NotificationTemplateFormValues,
): CreateNotificationTemplateDto {
  return {
    name: values.name,
    type: values.type,
    subject: values.subject || null,
    body: values.body,
    description: values.description,
    is_active: values.is_active,
  };
}
