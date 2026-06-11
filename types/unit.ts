export interface UnitDimension {
  name: string;
  value: number;
  unit: string;
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  info: Record<string, string | number | boolean>;
  dimension: UnitDimension[];
  created_at: string;
  updated_at: string;
}

export interface CreateUnitDto {
  name: string;
  description: string;
  is_active: boolean;
}
