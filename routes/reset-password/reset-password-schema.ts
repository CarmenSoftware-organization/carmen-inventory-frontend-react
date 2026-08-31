import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { createPasswordSchema } from "@/lib/password-schema";

/**
 * สร้าง Zod schema ของฟอร์มตั้งรหัสผ่านใหม่จากลิงก์ในอีเมล
 *
 * ใช้ `createPasswordSchema` ตัวเดียวกับฟอร์มสมัครและฟอร์มเปลี่ยนรหัสผ่าน — ความเข้มของรหัสผ่าน
 * ต้องเท่ากันทุกที่ที่ผู้ใช้ "ตั้ง" รหัส ไม่งั้นผู้ใช้จะเจอกฎคนละชุดในสองหน้าจอ
 *
 * ไม่มีช่องอีเมลและไม่มีช่องรหัสผ่านเดิม — token พิสูจน์ความเป็นเจ้าของอีเมลมาแล้ว และคนที่มาถึง
 * หน้านี้คือคนที่จำรหัสเดิมไม่ได้ตั้งแต่ต้น
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @returns Zod schema ของฟอร์มตั้งรหัสผ่านใหม่
 */
export function createResetPasswordSchema(tv: TranslationFn) {
  return z
    .object({
      password: createPasswordSchema(tv),
      confirm_password: z.string().min(1, tv("confirmPassword")),
    })
    .refine((data) => data.password === data.confirm_password, {
      message: tv("passwordMismatch"),
      path: ["confirm_password"],
    });
}

export type ResetPasswordValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;

export const EMPTY_RESET_PASSWORD: ResetPasswordValues = {
  password: "",
  confirm_password: "",
};
