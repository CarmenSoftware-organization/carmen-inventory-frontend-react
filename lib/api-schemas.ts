import { z } from "zod";

// Base wrapper for all paginated API responses
export const paginateSchema = z.object({
  total: z.number(),
  page: z.number(),
  perpage: z.number(),
  pages: z.number(),
});

/**
 * สร้าง Zod schema สำหรับ paginated response ของ API
 *
 * ห่อ item schema ด้วย { data: T[], paginate: {...} } ตาม format ของ backend
 * ใช้เป็น wrapper schema สำหรับ validate response ของทุก list endpoint
 *
 * @param itemSchema - Zod schema ของ item แต่ละรายการใน array
 * @returns Zod schema สำหรับ paginated response
 * @example
 * ```ts
 * const vendorList = paginatedResponse(vendorSchema);
 * const parsed = vendorList.parse(await res.json());
 * ```
 */
export function paginatedResponse<T extends z.ZodType>(itemSchema: T) {
  return z.looseObject({
    data: z.array(itemSchema),
    paginate: paginateSchema,
  });
}

// API envelope (backend wraps data in { data: ... })
/**
 * สร้าง Zod schema สำหรับ envelope แบบ { data: T } ของ backend
 *
 * ใช้กับ endpoint แบบ get-by-id ที่คืน { data: {...} }
 * ช่วยให้ parse response ได้โดยไม่ต้องเขียน z.object ซ้ำทุกครั้ง
 *
 * @param dataSchema - Zod schema ของข้อมูลภายใน field `data`
 * @returns Zod schema ของ envelope
 * @example
 * ```ts
 * const schema = apiEnvelope(vendorSchema);
 * const { data } = schema.parse(await res.json());
 * ```
 */
export function apiEnvelope<T extends z.ZodType>(dataSchema: T) {
  return z.object({ data: dataSchema });
}
