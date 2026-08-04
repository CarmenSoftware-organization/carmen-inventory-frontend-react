import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { createPasswordSchema } from "@/lib/password-schema";

export const USERNAME_MIN_LENGTH = 3;

/**
 * สร้าง Zod schema ของฟอร์มสมัครสมาชิก (`/register`)
 *
 * ข้อความทั้งหมดมาจาก namespace `validation` + `field` ตัวเดียวกับฟอร์มอื่นในแอป
 * และรหัสผ่านใช้ {@link createPasswordSchema} ร่วมกับหน้าเปลี่ยนรหัสผ่าน
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มสมัครสมาชิก
 */
export function createRegisterSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      firstName: z.string().trim().min(1, tv("required", { field: tf("firstName") })),
      lastName: z.string().trim().min(1, tv("required", { field: tf("lastName") })),
      username: z
        .string()
        .trim()
        .min(1, tv("required", { field: tf("username") }))
        .min(
          USERNAME_MIN_LENGTH,
          tv("minLength", { field: tf("username"), min: USERNAME_MIN_LENGTH }),
        ),
      email: z
        .string()
        .trim()
        .min(1, tv("required", { field: tf("email") }))
        .pipe(z.email(tv("invalidEmail"))),
      telephone: z.string().trim(),
      password: createPasswordSchema(tv),
      confirm_password: z.string().min(1, tv("confirmPassword")),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: tv("passwordMismatch"),
      path: ["confirm_password"],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

export const EMPTY_REGISTER_FORM: RegisterFormValues = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  telephone: "",
  password: "",
  confirm_password: "",
};
