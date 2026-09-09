import { z } from "zod";
import { SECRET_MASK, type EmailProfile } from "@/types/email-profile";

export const emailProfileSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  smtp_host: z.string().min(1),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_secure: z.boolean(),
  smtp_username: z.string().min(1),
  smtp_password: z.string().min(1),
  from_email: z.string().email(),
  from_name: z.string(),
  reply_to: z.union([z.string().email(), z.literal("")]),
  default_cc: z.string(), // คั่นด้วย , ; หรือช่องว่าง แปลงตอนบันทึก
  subject_template: z.string(),
  body_template: z.string(),
  note: z.string(),
});

export type EmailProfileFormValues = z.infer<typeof emailProfileSchema>;

export const EMPTY_EMAIL_PROFILE_FORM: EmailProfileFormValues = {
  name: "",
  enabled: true,
  smtp_host: "",
  smtp_port: 587,
  smtp_secure: true,
  smtp_username: "",
  smtp_password: "",
  from_email: "",
  from_name: "",
  reply_to: "",
  default_cc: "",
  subject_template: "",
  body_template: "",
  note: "",
};

/** ตัวแยกชุดเดียวกับ `config-email-component.tsx` เดิม — คั่นด้วย comma/semicolon/ช่องว่าง */
function splitEmailList(s: string): string[] {
  return s
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * คืนค่าเริ่มต้นของฟอร์มจากโปรไฟล์ที่มีอยู่ (หรือฟอร์มเปล่าถ้าเป็นโปรไฟล์ใหม่)
 *
 * โปรไฟล์เดิมเติมช่องรหัสผ่านด้วย `SECRET_MASK` (ไม่ใช่รหัสผ่านจริง — backend คืนค่านี้
 * เสมอ) ถ้าผู้ใช้ไม่แตะช่องนี้ ค่าที่ submit กลับไปคือ mask ตัวเดิม ซึ่ง backend จะแปลว่า
 * "ไม่เปลี่ยนรหัสผ่าน" แล้วคืนรหัสผ่านเดิมกลับมาเอง (ดู Task B1 Step 2)
 *
 * @param profile - โปรไฟล์ที่จะแก้ไข หรือ undefined สำหรับโปรไฟล์ใหม่
 * @returns ค่าเริ่มต้นของฟอร์ม
 */
export function toEmailProfileFormValues(
  profile?: EmailProfile,
): EmailProfileFormValues {
  if (!profile) return { ...EMPTY_EMAIL_PROFILE_FORM };
  return {
    name: profile.name,
    enabled: profile.enabled,
    smtp_host: profile.smtp.host,
    smtp_port: profile.smtp.port,
    smtp_secure: profile.smtp.secure,
    smtp_username: profile.smtp.username,
    smtp_password: SECRET_MASK,
    from_email: profile.from_email,
    from_name: profile.from_name,
    reply_to: profile.reply_to,
    default_cc: profile.default_cc.join(", "),
    subject_template: profile.subject_template,
    body_template: profile.body_template,
    note: profile.note ?? "",
  };
}

/**
 * แปลงค่าฟอร์มกลับเป็น `EmailProfile` หนึ่งรายการ
 *
 * โปรไฟล์ใหม่ (ไม่มี `existing`) สร้าง `id` ด้วย `crypto.randomUUID()` ตอนกดบันทึก
 * โปรไฟล์เดิมคง `id` เดิมไว้เสมอ — ตัวเรียก (หน้า list) เป็นคนเอาค่านี้ไปประกอบกับ
 * `profiles[]` ทั้งชุดก่อนส่ง ไม่ใช่หน้าที่ของฟังก์ชันนี้
 *
 * @param values - ค่าจากฟอร์ม
 * @param existing - โปรไฟล์เดิมที่กำลังแก้ไข (ไม่ใส่ = สร้างใหม่)
 * @returns `EmailProfile` ที่พร้อมประกอบเข้า `profiles[]`
 */
export function fromEmailProfileFormValues(
  values: EmailProfileFormValues,
  existing?: EmailProfile,
): EmailProfile {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name,
    enabled: values.enabled,
    smtp: {
      host: values.smtp_host,
      port: values.smtp_port,
      secure: values.smtp_secure,
      username: values.smtp_username,
      password: values.smtp_password,
    },
    from_email: values.from_email,
    from_name: values.from_name,
    reply_to: values.reply_to,
    default_cc: splitEmailList(values.default_cc),
    subject_template: values.subject_template,
    body_template: values.body_template,
    note: values.note,
  };
}
