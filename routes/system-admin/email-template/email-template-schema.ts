import { z } from "zod";
import { htmlToPlainText, sanitizeEmailHtml } from "@/lib/email-template";
import type { EmailDocType, EmailTemplate } from "@/types/email-template";

export const emailTemplateSchema = z.object({
  name: z.string().min(1),
  doc_type: z.enum(["po", "rfp"]),
  enabled: z.boolean(),
  subject_template: z.string().min(1),
  // editor ทิ้ง `<p></p>` ไว้เสมอเมื่อผู้ใช้ลบข้อความจนหมด — `.min(1)` บน HTML ดิบ
  // จึงมองว่ามีเนื้อหา ต้องวัดจากข้อความที่อ่านได้จริง
  body_template: z
    .string()
    .refine((html) => htmlToPlainText(html).length > 0, {
      message: "required",
    }),
  default_cc: z.string(), // คั่นด้วย , ; หรือช่องว่าง แปลงตอนบันทึก
  note: z.string(),
});

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

export const EMPTY_EMAIL_TEMPLATE_FORM: EmailTemplateFormValues = {
  name: "",
  doc_type: "po",
  enabled: true,
  subject_template: "",
  body_template: "",
  default_cc: "",
  note: "",
};

function splitEmailList(s: string): string[] {
  return s
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function toEmailTemplateFormValues(
  template?: EmailTemplate,
  docType?: EmailDocType,
): EmailTemplateFormValues {
  if (!template)
    return { ...EMPTY_EMAIL_TEMPLATE_FORM, doc_type: docType ?? "po" };
  return {
    name: template.name,
    doc_type: template.doc_type,
    enabled: template.enabled !== false,
    subject_template: template.subject_template,
    body_template: sanitizeEmailHtml(template.body_template),
    default_cc: template.default_cc?.join(", ") ?? "",
    note: template.note ?? "",
  };
}

/**
 * แปลงค่าฟอร์มกลับเป็น `EmailTemplate` หนึ่งรายการ (ผู้เรียกเป็นคนประกอบเข้า
 * `templates[]` ทั้งชุดก่อนบันทึก — save เขียนทับ value ทั้งก้อน)
 *
 * sanitize อีกรอบตรงนี้ เพราะค่าที่มาถึงอาจถูกวางทับด้วย paste หลัง editor
 * sanitize ไปแล้ว และนี่คือจุดสุดท้ายก่อนออกจากเบราว์เซอร์
 */
export function fromEmailTemplateFormValues(
  values: EmailTemplateFormValues,
  existing?: EmailTemplate,
): EmailTemplate {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name,
    doc_type: values.doc_type,
    enabled: values.enabled,
    subject_template: values.subject_template,
    body_template: sanitizeEmailHtml(values.body_template),
    default_cc: splitEmailList(values.default_cc),
    note: values.note,
  };
}
