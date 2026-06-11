import z from "zod";

export enum ADJUSTMENT_TYPE {
  STOCK_IN = "STOCK_IN",
  STOCK_OUT = "STOCK_OUT",
}

export const ADJUSTMENT_TYPE_OPTIONS = [
  { label: "Stock In", value: ADJUSTMENT_TYPE.STOCK_IN },
  { label: "Stock Out", value: ADJUSTMENT_TYPE.STOCK_OUT },
] as const;

export const adjustmentTypeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(ADJUSTMENT_TYPE, { error: "Type is required" }),
  description: z.string(),
  note: z.string(),
  is_active: z.boolean(),
});

export type AdjustmentTypeFormValues = z.infer<typeof adjustmentTypeSchema>;

export interface AdjustmentType extends AdjustmentTypeFormValues {
  id: string;
}

export interface CreateAdjustmentTypeDto {
  code: string;
  name: string;
  type: ADJUSTMENT_TYPE;
  description: string;
  note: string;
  is_active: boolean;
}
