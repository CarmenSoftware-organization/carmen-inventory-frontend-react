import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  AdjustmentDetailItemPayload,
  InventoryAdjustment,
} from "@/types/inventory-adjustment";

function createDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    product_id: z.string().min(1, tv("required", { field: tf("product") })),
    product_name: z.string(),
    product_local_name: z.string(),
    qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    cost_per_unit: z.coerce
      .number()
      .min(0, tv("minZero", { field: tf("costPerUnit") })),
    total_cost: z.coerce.number(),
    description: z
      .string()
      .max(256, tv("maxLength", { field: tf("description"), max: 256 })),
  });
}

export function createAdjSchema(
  tv: TranslationFn,
  tf: TranslationFn,
  periodStart?: string,
  periodEnd?: string,
) {
  return z.object({
    description: z
      .string()
      .max(256, tv("maxLength", { field: tf("description"), max: 256 })),
    doc_status: z.string().min(1),
    adjustment_type_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("adjustmentType") })),
    date: z
      .string()
      .min(1, tv("required", { field: tf("date") }))
      .refine(
        (v) => {
          if (!periodStart || !periodEnd || !v) return true;
          const d = new Date(v);
          return d >= new Date(periodStart) && d <= new Date(periodEnd);
        },
        { message: tv("dateOutsidePeriod") },
      ),
    location_id: z.string().min(1, tv("required", { field: tf("location") })),
    items: z
      .array(createDetailSchema(tv, tf))
      .min(1, tv("atLeastOneItem", { item: tf("product") })),
  });
}

export type AdjFormValues = z.infer<ReturnType<typeof createAdjSchema>>;

export const ADJ_ITEM: AdjFormValues["items"][number] = {
  product_id: "",
  product_name: "",
  product_local_name: "",
  qty: 1,
  cost_per_unit: 0,
  total_cost: 0,
  description: "",
};

export function mapItemToPayload(
  item: AdjFormValues["items"][number],
): AdjustmentDetailItemPayload {
  return {
    product_id: item.product_id,
    qty: item.qty,
    cost_per_unit: item.cost_per_unit,
    total_cost: item.total_cost,
    description: item.description,
  };
}

function minDate(a: Date, b: Date): Date {
  return new Date(Math.min(a.getTime(), b.getTime()));
}

/** Cap today's date at the end of the current period so add-mode never starts outside it. */
export function resolveDefaultDate(periodEnd?: string): string {
  const today = new Date();
  if (!periodEnd) return today.toISOString();
  const endDate = new Date(periodEnd);
  return minDate(endDate, today).toISOString();
}

export function getDefaultValues(
  adj?: InventoryAdjustment,
  periodEnd?: string,
): AdjFormValues {
  if (adj) {
    const details = adj.stock_in_detail ?? adj.stock_out_detail ?? [];
    return {
      description: adj.description ?? "",
      doc_status: adj.doc_status ?? "draft",
      adjustment_type_id: adj.adjustment_type_id ?? null,
      date: adj.si_date ?? adj.so_date ?? "",
      location_id: adj.location_id ?? "",
      items: details.map((d) => ({
        id: d.id,
        product_id: d.product_id,
        product_name: d.product_name,
        product_local_name: d.product_local_name,
        qty: d.qty,
        cost_per_unit: d.cost_per_unit,
        total_cost: d.total_cost,
        description: d.description ?? "",
      })),
    };
  }
  return {
    description: "",
    doc_status: "draft",
    adjustment_type_id: null,
    date: resolveDefaultDate(periodEnd),
    location_id: "",
    items: [],
  };
}
