import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { RunningCode } from "@/types/running-code";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์ม Running Code
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema สำหรับ Running Code form
 */
export function createRunningCodeSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    type: z.string().min(1, tv("required", { field: tf("type") })),
    config: z.string().refine(
      (v) => {
        if (!v) return true;
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: tv("invalidJson", { field: tf("config") }) },
    ),
    note: z.string(),
  });
}

export type RunningCodeFormValues = z.infer<
  ReturnType<typeof createRunningCodeSchema>
>;

export const EMPTY_FORM: RunningCodeFormValues = {
  type: "",
  config: "",
  note: "",
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Running Code จากข้อมูล entity
 * @param runningCode - ข้อมูล Running Code สำหรับใช้เป็นค่าเริ่มต้น
 * @returns ค่าเริ่มต้นของ RunningCodeFormValues
 */
export function getDefaultValues(
  runningCode?: RunningCode,
): RunningCodeFormValues {
  if (!runningCode) return { ...EMPTY_FORM };
  return {
    type: runningCode.type,
    config: runningCode.config
      ? JSON.stringify(runningCode.config, null, 2)
      : "",
    note: runningCode.note ?? "",
  };
}
