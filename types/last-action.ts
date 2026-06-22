import { z } from "zod";

/**
 * Nested last-action object returned on PR/PO/SR detail and list responses.
 * อ็อบเจกต์ last-action ที่ส่งกลับมาในรายการและรายละเอียดของ PR/PO/SR
 */
export const lastActionSchema = z.object({
  state: z.string().nullable(),
  at: z.string().nullable(),
  id: z.string().nullable(),
  name: z.string().nullable(),
});

export type LastAction = z.infer<typeof lastActionSchema>;
