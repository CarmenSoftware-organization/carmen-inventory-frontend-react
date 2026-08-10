import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { createPasswordSchema } from "@/lib/password-schema";

/**
 * สร้าง Zod schema ของขั้นที่หนึ่ง — อีเมลอย่างเดียว
 *
 * ขั้นนี้ยังไม่สร้างบัญชี มันแค่ขอลิงก์ไปยังอีเมลนั้น ฟอร์มจึงไม่ถามอะไรมากกว่านี้
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มขอลิงก์สมัคร
 */
export function createSignupEmailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, tv("required", { field: tf("email") }))
      .pipe(z.email(tv("invalidEmail"))),
  });
}

export type SignupEmailValues = z.infer<
  ReturnType<typeof createSignupEmailSchema>
>;

export const EMPTY_SIGNUP_EMAIL: SignupEmailValues = { email: "" };

/**
 * สร้าง Zod schema ของขั้นที่สอง — โปรไฟล์และรหัสผ่าน
 *
 * ใช้ร่วมกันทั้งเส้นทางสมัครและเส้นทางรับคำเชิญ เพราะทั้งสองเส้นทางมาถึงจุดนี้ได้ก็ต่อเมื่ออีเมล
 * ถูกพิสูจน์แล้ว จึงเหลือถามแค่ตัวตนกับรหัสผ่าน ไม่มีช่องอีเมลและไม่มีช่อง username —
 * อีเมลมาจาก token และ backend ตั้ง username เท่ากับอีเมลเสมอ
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มสร้างบัญชี
 */
export function createSignupProfileSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1, tv("required", { field: tf("firstName") })),
      lastName: z
        .string()
        .trim()
        .min(1, tv("required", { field: tf("lastName") })),
      telephone: z.string().trim(),
      password: createPasswordSchema(tv),
      confirm_password: z.string().min(1, tv("confirmPassword")),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: tv("passwordMismatch"),
      path: ["confirm_password"],
    });
}

export type SignupProfileValues = z.infer<
  ReturnType<typeof createSignupProfileSchema>
>;

export const EMPTY_SIGNUP_PROFILE: SignupProfileValues = {
  firstName: "",
  lastName: "",
  telephone: "",
  password: "",
  confirm_password: "",
};
