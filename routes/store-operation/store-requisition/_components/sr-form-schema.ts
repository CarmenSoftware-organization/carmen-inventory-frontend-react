import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับรายการสินค้า (detail item) ของใบเบิก
 * ใช้ภายใน createSrSchema สำหรับ items array
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod object schema ของ SR detail
 * @example
 * const detailSchema = createSrDetailSchema(tv, tf);
 */
function createSrDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    product_id: z.string().min(1, tv("required", { field: tf("product") })),
    product_name: z.string(),
    unit_name: z.string(),
    description: z.string(),
    requested_qty: z.coerce.number().min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    approved_qty: z.coerce.number(),
    issued_qty: z.coerce.number(),
    current_stage_status: z.string(),
    stage_status: z.string().optional(),
    stage_message: z.string().optional(),
  });
}

/**
 * สร้าง Zod schema หลักของฟอร์มใบเบิกสินค้า (Store Requisition)
 * รวมการตรวจสอบ cross-field วัน expected ต้องไม่น้อยกว่า sr_date
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema ของ SR form
 * @example
 * const schema = createSrSchema(tv, tf);
 * const form = useForm({ resolver: zodResolver(schema) });
 */
export function createSrSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      sr_date: z.string().min(1, tv("required", { field: tf("srDate") })),
      expected_date: z.string().min(1, tv("required", { field: tf("expectedDate") })),
      description: z.string(),
      workflow_id: z.string().min(1, tv("required", { field: tf("workflow") })),
      requestor_id: z.string(),
      department_id: z.string().min(1, tv("required", { field: tf("department") })),
      from_location_id: z.string().min(1, tv("required", { field: tf("fromLocation") })),
      to_location_id: z.string().min(1, tv("required", { field: tf("toLocation") })),
      items: z
        .array(createSrDetailSchema(tv, tf))
        .min(1, tv("atLeastOneItem", { item: tf("items") })),
    })
    .refine(
      (data) => {
        if (!data.sr_date || !data.expected_date) return true;
        const toDay = (iso: string) => {
          const d = new Date(iso);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        };
        return toDay(data.expected_date) >= toDay(data.sr_date);
      },
      {
        message: tv("expectedDateAfterSr"),
        path: ["expected_date"],
      },
    );
}

export type SrFormValues = z.infer<ReturnType<typeof createSrSchema>>;

export const SR_ITEM = {
  product_id: "",
  product_name: "",
  unit_name: "",
  description: "",
  requested_qty: 1,
  approved_qty: 0,
  issued_qty: 0,
  current_stage_status: "pending",
  stage_status: "",
  stage_message: "",
} as const;

export const SR_ITEM_STAGE = {
  PENDING: "pending",
  APPROVE: "approve",
  REJECT: "reject",
  REVIEW: "review",
} as const;

export function computeSrAction(
  statuses: string[],
): "none" | "review" | "rejected" | "approved" {
  const active = statuses.filter(Boolean);
  if (active.length === 0) return "none";
  if (active.some((s) => s === SR_ITEM_STAGE.REVIEW)) return "review";
  if (active.every((s) => s === SR_ITEM_STAGE.REJECT)) return "rejected";
  if (
    active.every(
      (s) => s === SR_ITEM_STAGE.APPROVE || s === SR_ITEM_STAGE.REJECT,
    ) &&
    active.some((s) => s === SR_ITEM_STAGE.APPROVE)
  )
    return "approved";
  return "none";
}
