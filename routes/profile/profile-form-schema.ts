import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { UserProfile } from "@/types/profile";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์มโปรไฟล์ผู้ใช้
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod object schema ของฟอร์มโปรไฟล์
 */
export function createProfileSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    alias_name: z.string().max(2, tv("aliasMaxLength", { max: 2 })),
    firstname: z.string().min(1, tv("required", { field: tf("firstName") })),
    middlename: z.string(),
    lastname: z.string().min(1, tv("required", { field: tf("lastName") })),
    telephone: z.string(),
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

export const EMPTY_FORM: ProfileFormValues = {
  alias_name: "",
  firstname: "",
  middlename: "",
  lastname: "",
  telephone: "",
};

/**
 * สร้างค่า default ของฟอร์มโปรไฟล์จากข้อมูล UserProfile
 * @param profile - ข้อมูลโปรไฟล์ผู้ใช้ (optional)
 * @returns ค่าเริ่มต้นของฟอร์มโปรไฟล์
 */
export function getDefaultValues(profile?: UserProfile): ProfileFormValues {
  if (!profile) return EMPTY_FORM;
  return {
    alias_name: profile.alias_name ?? "",
    firstname: profile.user_info.firstname ?? "",
    middlename: profile.user_info.middlename ?? "",
    lastname: profile.user_info.lastname ?? "",
    telephone: profile.user_info.telephone ?? "",
  };
}

/**
 * สร้าง Zod schema สำหรับฟอร์มเปลี่ยนรหัสผ่าน
 * รวมการตรวจสอบความเข้มแข็งของรหัสผ่านและการยืนยันที่ตรงกัน
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มเปลี่ยนรหัสผ่าน
 */
export function createChangePasswordSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      current_password: z.string().min(1, tv("required", { field: tf("currentPassword") })),
      new_password: z
        .string()
        .min(8, tv("passwordMinLength", { min: 8 }))
        .regex(/[A-Z]/, tv("passwordUppercase"))
        .regex(/[a-z]/, tv("passwordLowercase"))
        .regex(/[0-9]/, tv("passwordNumber"))
        .regex(/[^A-Za-z0-9]/, tv("passwordSpecial")),
      confirm_password: z.string().min(1, tv("confirmPassword")),
    })
    .refine((data) => data.new_password !== data.current_password, {
      message: tv("passwordSameAsCurrent"),
      path: ["new_password"],
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: tv("passwordMismatch"),
      path: ["confirm_password"],
    });
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;

export const EMPTY_PASSWORD_FORM: ChangePasswordFormValues = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};
