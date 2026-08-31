import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { createPasswordSchema } from "@/lib/password-schema";

/**
 * สร้าง Zod schema สำหรับฟอร์มเปลี่ยนรหัสผ่าน
 * รวมการตรวจสอบความเข้มแข็งของรหัสผ่านและการยืนยันที่ตรงกัน
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มเปลี่ยนรหัสผ่าน
 */
export function createChangePasswordSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z
    .object({
      current_password: z
        .string()
        .min(1, tv("required", { field: tf("currentPassword") })),
      new_password: createPasswordSchema(tv),
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

export type ChangePasswordFormValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;

export const EMPTY_PASSWORD_FORM: ChangePasswordFormValues = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};
