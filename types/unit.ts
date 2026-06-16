export interface UnitDimension {
  name: string;
  value: number;
  unit: string;
}

export interface Unit {
  id: string;
  /** Optimistic-concurrency token — the backend requires it back on update (PUT). */
  doc_version: number;
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
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
