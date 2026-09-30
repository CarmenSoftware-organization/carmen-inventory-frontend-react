export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  cost_center_group_id?: string;
  cost_center_group_code?: string | null;
  cost_center_group_name?: string | null;
  is_active?: boolean;
  doc_version?: number;
}

export type CreateCostCenterDto = Omit<CostCenter, "id" | "doc_version">;
