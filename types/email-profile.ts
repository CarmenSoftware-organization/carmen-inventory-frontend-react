/** โปรไฟล์ผู้ส่งอีเมลของหน่วยธุรกิจ — เก็บรวมกันใน app-config key `email_profiles` */
export interface EmailProfile {
  id: string;
  name: string;
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    /** backend คืนเป็น `***ENCRYPTED***` เสมอ — ส่งค่านี้กลับไปแปลว่า "ไม่เปลี่ยนรหัสผ่าน" */
    password: string;
  };
  from_email: string;
  from_name: string;
  reply_to: string;
  default_cc: string[];
  subject_template: string;
  body_template: string;
  /** บันทึกภายในของผู้ดูแลระบบ — ไม่เคยถูกส่งออกไปกับอีเมล */
  note: string;
}

export interface EmailProfilesValue {
  default_profile_id: string | null;
  profiles: EmailProfile[];
}

/** ค่าที่ backend ใช้แทนรหัสผ่านที่เก็บไว้ — ห้ามแสดงเป็นข้อความจริงในฟอร์ม */
export const SECRET_MASK = "***ENCRYPTED***";

export const EMAIL_PROFILES_CONFIG_KEY = "email_profiles";
