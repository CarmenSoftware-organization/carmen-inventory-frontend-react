import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

const FREQUENCY = ["daily", "weekly", "monthly"] as const;

/**
 * Zod schema factory ของ Create Schedule form
 *
 * `days_of_week` required เมื่อ frequency=weekly, `days_of_month` required
 * เมื่อ frequency=monthly — ตรวจผ่าน `.superRefine` เพราะขึ้นกับค่าฟิลด์อื่น
 *
 * @param tv - useTranslations("validation")
 * @param tf - useTranslations("field")
 * @returns Zod object schema
 */
export function createScheduleSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      name: z.string().min(1, tv("required", { field: tf("name") })),
      report_template_id: z
        .string()
        .min(1, tv("required", { field: tf("reportTemplate") })),
      frequency: z.enum(FREQUENCY),
      time: z.string().min(1, tv("required", { field: tf("time") })),
      days_of_week: z.array(z.number().int().min(0).max(6)),
      days_of_month: z.array(z.number().int().min(1).max(31)),
      notify_web: z.boolean(),
      notify_email: z.boolean(),
      filters: z.record(z.string(), z.string()),
      recipients: z.array(z.string()),
    })
    .superRefine((val, ctx) => {
      if (val.frequency === "weekly" && val.days_of_week.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["days_of_week"],
          message: tv("required", { field: tf("daysOfWeek") }),
        });
      }
      if (val.frequency === "monthly" && val.days_of_month.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["days_of_month"],
          message: tv("required", { field: tf("daysOfMonth") }),
        });
      }
    });
}

export type ScheduleFormValues = z.infer<
  ReturnType<typeof createScheduleSchema>
>;

export const EMPTY_FORM: ScheduleFormValues = {
  name: "",
  report_template_id: "",
  frequency: "daily",
  time: "08:00",
  days_of_week: [],
  days_of_month: [],
  notify_web: false,
  notify_email: false,
  filters: {},
  recipients: [],
};

/**
 * คืน defaults ของ form — เหมือน `EMPTY_FORM` แต่ wrap เป็นฟังก์ชันเผื่อ
 * ภายหลังต้อง seed จาก profile/context
 *
 * @returns ScheduleFormValues
 */
export function getDefaultValues(): ScheduleFormValues {
  return { ...EMPTY_FORM, days_of_week: [], days_of_month: [], filters: {}, recipients: [] };
}
