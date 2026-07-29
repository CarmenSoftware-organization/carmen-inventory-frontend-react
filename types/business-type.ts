import type { Audit } from "./audit";

export interface BusinessType {
  id: string;
  /** Optimistic-concurrency token — backend requires it back on PATCH update. */
  doc_version: number;
  name: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateBusinessTypeDto {
  name: string;
  is_active: boolean;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
