import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * ข้อกำหนดรหัสผ่านกลางของแอป — ทุกฟอร์มที่ให้ผู้ใช้ "ตั้ง" รหัสผ่าน (สมัครสมาชิก,
 * เปลี่ยนรหัสผ่าน, ตั้งรหัสใหม่จากลิงก์) ต้องเรียกตัวนี้ ห้ามเขียน regex เอง
 * ไม่งั้นสองหน้าจะเข้มไม่เท่ากันแล้วผู้ใช้งงว่าตกลงต้องยาวเท่าไหร่
 *
 * เข้มกว่าที่ backend บังคับ (RegisterDto ขอแค่ 6 ตัว) โดยตั้งใจ — backend คือ
 * เพดานล่าง ไม่ใช่มาตรฐานที่เราอยากได้
 *
 * หมายเหตุ: หน้า login ไม่ใช้ตัวนี้ คนที่ตั้งรหัสไว้ก่อนกฎนี้ยังต้องเข้าระบบได้
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * @param tv - ฟังก์ชันแปลข้อความ validation (`useTranslations("validation")`)
 * @returns Zod string schema ของช่องรหัสผ่านใหม่
 */
export function createPasswordSchema(tv: TranslationFn) {
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, tv("passwordMinLength", { min: PASSWORD_MIN_LENGTH }))
    .regex(/[A-Z]/, tv("passwordUppercase"))
    .regex(/[a-z]/, tv("passwordLowercase"))
    .regex(/[0-9]/, tv("passwordNumber"))
    .regex(/[^A-Za-z0-9]/, tv("passwordSpecial"));
}
