import { z } from "zod";
import type {
  CreateNotificationTemplateDto,
  NotificationTemplate,
} from "@/types/noti-tmpl";

export const notificationTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // ฟอร์มสร้างได้เฉพาะ `app` แต่ enum ยังรับครบสี่ค่า เพราะเทมเพลตชุดเก่าของ
  // email/line/sms ยังอยู่ใน DB — เปิดผ่านลิงก์ตรงแล้วต้องไม่ติด validation
  // และ `mapToPayload` ส่ง type เดิมกลับไป ไม่แปลงเป็น app เงียบ ๆ
  type: z.enum(["app", "email", "line", "sms"]),
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

export function mapToPayload(
  values: NotificationTemplateFormValues,
): CreateNotificationTemplateDto {
  return {
    name: values.name,
    type: values.type,
    // ฟอร์มไม่มีช่องหัวเรื่องแล้ว (เป็นของอีเมลที่เลิกใช้) — ส่งค่าเดิมกลับไป
    // ตามที่โหลดมา ไม่ล้างเป็น null เพื่อไม่ทำข้อมูลของเทมเพลตเก่าหาย
    subject: values.subject || null,
    body: values.body,
    description: values.description,
    is_active: values.is_active,
  };
}
