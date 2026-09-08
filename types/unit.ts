import type { Audit } from "./audit";

interface UnitDimension {
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
  /**
   * จำนวนทศนิยมของจำนวนที่นับด้วยหน่วยนี้ (0–5) — ช่องกรอก qty ทุกที่อ่านค่านี้
   * ผ่าน `useUnitDecimals` เช่น BOX24 = 2 → กรอก 1.25 กล่องได้
   */
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
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
