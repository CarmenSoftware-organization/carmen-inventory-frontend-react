export type InventoryAdjustmentType = "stock-in" | "stock-out";
export type InventoryAdjustmentStatus =
  | "in_progress"
  | "completed"
  | "draft"
  | "voided";

export const INVENTORY_ADJUSTMENT_BASE_PATH =
  "/inventory-management/inventory-adjustment";

export const getAdjustmentType = (
  item: Pick<InventoryAdjustment, "si_no">,
): InventoryAdjustmentType => (item.si_no ? "stock-in" : "stock-out");

export interface InventoryAdjustmentDetail {
  id: string;
  sequence_no: number;
  product_id: string;
  product_name: string;
  product_code: string;
  product_local_name: string;
  product_sku: string;
  description: string | null;
  qty: number;
  cost_per_unit: number;
  total_cost: number;
  info: unknown;
  dimension: unknown;
}

export interface InventoryAdjustment {
  id: string;
  si_no?: string;
  so_no?: string;
  si_date?: string;
  so_date?: string;
  description: string;
  adjustment_type_id: string;
  adjustment_type_code: string;
  adjustment_type_name: string;
  doc_status: InventoryAdjustmentStatus;
  doc_version: number;
  location_id?: string;
  location_name?: string;
  stock_in_detail?: InventoryAdjustmentDetail[];
  stock_out_detail?: InventoryAdjustmentDetail[];
  item_count?: number;
  base_total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface AdjustmentDetailItemPayload {
  product_id: string;
  qty: number;
  cost_per_unit: number;
  total_cost: number;
  description: string;
}

interface AdjustmentDetailPayload {
  add?: AdjustmentDetailItemPayload[];
  update?: (AdjustmentDetailItemPayload & { id: string })[];
  remove?: { id: string }[];
}

export interface CreateInventoryAdjustmentDto {
  description: string;
  doc_status: string;
  adjustment_type_id: string;
  si_date?: string;
  so_date?: string;
  location_id: string;
  stock_in_detail?: AdjustmentDetailPayload;
  stock_out_detail?: AdjustmentDetailPayload;
}
