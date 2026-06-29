export type PhysicalCountStatus = "not_started" | "in_progress" | "completed";

export type LocationType = "inventory" | "direct" | "consignment";

export type PhysicalCountType = "yes" | "no";

export interface PhysicalCountLocation {
  id: string;
  code: string;
  name: string;
  location_type: LocationType;
  physical_count_type: PhysicalCountType;
  product_counted: number;
  product_total: number;
  physical_count_status: PhysicalCountStatus;
  physical_count_id: string | null;
  start_counting_at: string | null;
  completed_at: string | null;
}

export interface CurrentPeriodData {
  id: string;
  period_id: string;
  tb_period: {
    id: string;
    period: string;
    start_at: string;
    end_at: string;
  };
  status: string;
  locations: PhysicalCountLocation[];
}

export interface CurrentPeriodResponse {
  data: CurrentPeriodData;
  status: number;
  success: boolean;
  message: string;
  timestamp: string;
}

// GET /physical-count/{id} response
export interface PhysicalCountDetail {
  id: string;
  physical_count_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  product_sku: string;
  inventory_unit_id: string;
  inventory_unit_name: string;
  on_hand_qty: number;
  actual_qty: number | null;
  diff_qty: number;
  counted_at: string | null;
  counted_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhysicalCountData {
  id: string;
  physical_count_period_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  physical_count_type: PhysicalCountType;
  description: string | null;
  status: string;
  start_counting_at: string | null;
  start_counting_by_id?: string | null;
  completed_at: string | null;
  completed_by_id?: string | null;
  product_counted: number;
  product_total: number;
  created_at: string;
  created_by_id?: string | null;
  updated_at: string;
  updated_by_id?: string | null;
  doc_version?: number;
  details: PhysicalCountDetail[];
}

// Legacy type (used by old form)
export interface PhysicalCount {
  id: string;
  department_id: string;
  department_name: string;
  is_active: boolean;
  doc_version?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePhysicalCountDto {
  physical_count_period_id: string;
  location_id: string;
  description?: string;
}

// PATCH /physical-count/{id}/save request
export interface PhysicalCountSaveItemDto {
  id: string;
  actual_qty: number;
}

export interface PhysicalCountSaveDto {
  doc_version?: number;
  items: PhysicalCountSaveItemDto[];
}
