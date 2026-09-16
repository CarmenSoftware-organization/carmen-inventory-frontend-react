/** ชนิดเอกสารที่ส่งทางอีเมลได้ — คุมทั้ง placeholder ที่ใช้ได้และ dropdown ตอนส่ง */
export type EmailDocType = "po" | "rfp";

export const EMAIL_DOC_TYPES: readonly EmailDocType[] = ["po", "rfp"];

export interface EmailTemplate {
  id: string;
  name: string;
  doc_type: EmailDocType;
  enabled: boolean;
  /** ข้อความล้วน — หัวเรื่องอีเมลไม่รองรับ HTML */
  subject_template: string;
  /** HTML — ผ่าน sanitizeEmailHtml ทั้งตอนอ่านและตอนบันทึก */
  body_template: string;
  default_cc: string[];
  note: string;
}

export interface EmailTemplatesValue {
  /** template ที่เลือกให้อัตโนมัติตอนเปิด dialog ส่งอีเมลของเอกสารชนิดนั้น */
  defaults: Partial<Record<EmailDocType, string | null>>;
  templates: EmailTemplate[];
}

export const EMAIL_TEMPLATES_CONFIG_KEY = "email_templates";
