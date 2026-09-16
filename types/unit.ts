import type { Audit } from "./audit";

interface UnitDimension {
  name: string;
  value: number;
  unit: string;
}

export interface Unit {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  is_active: boolean;
  decimal_place: number;
  info: Record<string, string | number | boolean>;
  dimension: UnitDimension[];
  audit?: Audit;
}

export interface CreateUnitDto {
  name: string;
  description: string;
  is_active: boolean;
  decimal_place: number;
  doc_version?: number;
}
