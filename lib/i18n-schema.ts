/**
 * Type ของฟังก์ชันแปลภาษา สำหรับใช้ใน Zod schema factory ทำงานได้กับค่าที่คืนจาก useTranslations() ของ next-intl
 *
 * Schema factory ปกติรับ 2 ฟังก์ชัน
 * - `tv`: useTranslations("validation") สำหรับข้อความ validation
 * - `tf`: useTranslations("field") สำหรับชื่อ field
 *
 * @param key - translation key ที่ต้องการแปล
 * @param values - ตัวแปรที่ส่งเข้าไปใน message (optional)
 * @returns ข้อความที่แปลแล้ว
 * @example
 * ```ts
 * function createUserSchema(tv: TranslationFn, tf: TranslationFn) {
 *   return z.object({
 *     name: z.string().min(1, tv("required", { field: tf("name") })),
 *   });
 * }
 * ```
 */
export type TranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;
