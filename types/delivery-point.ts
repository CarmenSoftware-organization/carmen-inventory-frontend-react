import type { Audit } from "./audit";

export interface DeliveryPoint {
  id: string;
  doc_version: number;
  name: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateDeliveryPointDto {
  doc_version?: number;
  name: string;
  is_active: boolean;
}
