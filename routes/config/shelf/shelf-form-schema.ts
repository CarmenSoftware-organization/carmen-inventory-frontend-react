import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Shelf } from "@/types/shelf";

export function createShelfSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    // ช่องว่าง = ไม่ส่ง (ให้ backend จัดลำดับเอง) — z.coerce เปล่า ๆ ตีค่า "" เป็น 0
    sequence_no: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce
        .number()
        .int(tv("minNumber", { field: tf("sequence"), min: 1 }))
        .min(1, tv("minNumber", { field: tf("sequence"), min: 1 }))
        .optional(),
    ),
    is_active: z.boolean(),
  });
}

export type ShelfFormValues = z.infer<ReturnType<typeof createShelfSchema>>;

export const EMPTY_FORM: ShelfFormValues = {
  code: "",
  name: "",
  description: "",
  sequence_no: undefined,
  is_active: true,
};

export function getDefaultValues(shelf?: Shelf): ShelfFormValues {
  if (!shelf) return { ...EMPTY_FORM };
  return {
    code: shelf.code,
    name: shelf.name,
    description: shelf.description ?? "",
    sequence_no: shelf.sequence_no ?? undefined,
    is_active: shelf.is_active,
  };
}
